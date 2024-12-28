import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import os

from .jar_manager import JarManager
from .test_analyzer import TestAnalyzer
from .report_manager import ReportManager
from .utils.logging import get_logger

logger = get_logger(__name__)

class TestExecutor:
    def __init__(self, workspace_path: Path):
        self.workspace_path = workspace_path
        self.jar_manager = JarManager(workspace_path)
        self.test_analyzer = TestAnalyzer()
        self.report_manager = ReportManager(workspace_path)
        self.running = False

    async def execute_test(self, 
                          file_path: str, 
                          scenario: Optional[str] = None,
                          env_vars: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Execute a Karate test with detailed output handling."""
        if self.running:
            logger.warning("A test is already running")
            return {"status": "error", "message": "A test is already running"}

        self.running = True
        try:
            test_path = Path(file_path)
            if not test_path.exists():
                raise FileNotFoundError(f"Test file not found: {file_path}")

            # Send start message
            logger.info(f"Starting test execution: {file_path}")
            self.send_message("test_start", file=file_path)

            # Ensure we have the JAR
            karate_jar = await self.ensure_jar_async()
            
            # Build command
            cmd = ["java", "-jar", karate_jar, str(test_path)]
            if scenario:
                cmd.extend(["--name", scenario])

            # Set up environment
            env = os.environ.copy()
            if env_vars:
                env.update(env_vars)

            # Execute test
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
                cwd=str(self.workspace_path)
            )

            # Process output
            output_lines = []
            async for line in self.process_output(process):
                output_lines.append(line)

            # Wait for completion
            returncode = await process.wait()

            # Process results
            success = returncode == 0
            results = {
                'file': str(test_path),
                'scenario': scenario,
                'status': 'passed' if success else 'failed',
                'output': output_lines
            }

            # Update history
            await self.update_history(results)

            # Send completion message
            self.send_message("test_end", status=results['status'])

            return results

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Test execution error: {error_msg}")
            self.send_message("error", message=error_msg)
            return {
                'status': 'error',
                'message': error_msg
            }
        finally:
            self.running = False

    async def ensure_jar_async(self) -> str:
        """Ensure JAR exists (async wrapper)."""
        return await asyncio.to_thread(self.jar_manager.ensure_jar)

    async def process_output(self, process):
        """Process test output stream."""
        while True:
            line = await process.stdout.readline()
            if not line:
                break
                
            line_str = line.decode().strip()
            if line_str:
                self.send_message("output", line=line_str)
                yield line_str

            # Also check stderr
            err = await process.stderr.readline()
            if err:
                err_str = err.decode().strip()
                self.send_message("error", message=err_str)
                yield f"ERROR: {err_str}"

    async def update_history(self, results: Dict[str, Any]):
        """Update test history asynchronously."""
        await asyncio.to_thread(
            self.report_manager.save_run_history,
            results
        )

    def send_message(self, message_type: str, **kwargs):
        """Send a formatted JSON message to stdout."""
        message = {"type": message_type, **kwargs}
        print(json.dumps(message), flush=True)

    def cleanup(self):
        """Clean up resources."""
        self.jar_manager.cleanup()