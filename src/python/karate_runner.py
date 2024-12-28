#!/usr/bin/env python3

import sys
import json
import os
import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import subprocess
from jar_manager import JarManager

class KarateRunner:
    def __init__(self):
        self.logger = self._setup_logging()
        self.jar_manager = JarManager(Path(__file__).parent.parent.parent)

    def _setup_logging(self) -> logging.Logger:
        logger = logging.getLogger("KarateRunner")
        logger.setLevel(logging.DEBUG)
        
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.DEBUG)
        
        formatter = logging.Formatter(
            '{"type": "log", "message": "%(message)s"}'
        )
        handler.setFormatter(formatter)
        
        logger.addHandler(handler)
        return logger

    def send_message(self, message_type: str, **kwargs):
        """Send a formatted JSON message to stdout."""
        message = {"type": message_type, **kwargs}
        print(json.dumps(message), flush=True)

    async def run_test(self, file_path: str, scenario: Optional[str] = None):
        """Run a Karate test file."""
        try:
            self.send_message("test_start", file=file_path)
            
            # Ensure we have the JAR
            karate_jar = self.jar_manager.ensure_jar()
            
            # Build command
            cmd = ["java", "-jar", karate_jar, file_path]
            if scenario:
                cmd.extend(["--name", scenario])
            
            # Run the test
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                text=True
            )
            
            # Process output in real-time
            while True:
                line = await process.stdout.readline()
                if not line and process.stdout.at_eof():
                    break
                if line:
                    self.send_message("log", message=line.strip())
            
            # Wait for process to complete
            await process.wait()
            
            # Check for errors
            if process.returncode != 0:
                stderr = await process.stderr.read()
                self.send_message("error", message=stderr)
                self.send_message("test_end", status="failed")
            else:
                self.send_message("test_end", status="passed")
                
        except Exception as e:
            self.send_message("error", message=str(e))
            self.send_message("test_end", status="error")

    async def process_command(self, command: Dict[str, Any]):
        """Process a command received from the extension."""
        cmd_type = command.get("command")
        
        if cmd_type == "run_test":
            await self.run_test(
                command["file"],
                command.get("scenario")
            )
        else:
            self.send_message(
                "error",
                message=f"Unknown command: {cmd_type}"
            )

async def main():
    runner = KarateRunner()
    
    # Process commands from stdin
    for line in sys.stdin:
        try:
            command = json.loads(line.strip())
            await runner.process_command(command)
        except json.JSONDecodeError:
            runner.send_message(
                "error",
                message="Invalid JSON command"
            )
        except Exception as e:
            runner.send_message(
                "error",
                message=str(e)
            )

if __name__ == "__main__":
    asyncio.run(main())