import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import shutil

class ReportManager:
    def __init__(self, workspace_path: Path):
        self.workspace_path = workspace_path
        self.reports_dir = workspace_path / 'target' / 'karate-reports'
        self.history_file = workspace_path / '.karate-history.json'

    def ensure_reports_dir(self) -> None:
        """Ensure reports directory exists."""
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def get_report_path(self, feature_name: str) -> Path:
        """Get the path for a specific feature report."""
        return self.reports_dir / f"{Path(feature_name).stem}.html"

    def save_run_history(self, run_data: Dict[str, Any]) -> None:
        """Save test run history."""
        history: List[Dict[str, Any]] = []
        
        if self.history_file.exists():
            with open(self.history_file, 'r') as f:
                try:
                    history = json.load(f)
                except json.JSONDecodeError:
                    history = []

        # Add new run data
        run_data['timestamp'] = datetime.now().isoformat()
        history.append(run_data)

        # Keep only last 100 runs
        if len(history) > 100:
            history = history[-100:]

        with open(self.history_file, 'w') as f:
            json.dump(history, f, indent=2)

    def get_run_history(self) -> List[Dict[str, Any]]:
        """Get test run history."""
        if not self.history_file.exists():
            return []

        with open(self.history_file, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []

    def cleanup_old_reports(self, max_age_days: int = 30) -> None:
        """Clean up old report files."""
        if not self.reports_dir.exists():
            return

        current_time = datetime.now().timestamp()
        max_age_seconds = max_age_days * 24 * 60 * 60

        for report_file in self.reports_dir.glob('*.html'):
            file_age = current_time - report_file.stat().st_mtime
            if file_age > max_age_seconds:
                report_file.unlink(missing_ok=True)

    def process_test_output(self, output: str) -> Dict[str, Any]:
        """Process test output to extract key information."""
        results = {
            'scenarios': 0,
            'passed': 0,
            'failed': 0,
            'errors': []
        }

        for line in output.split('\n'):
            if 'scenarios:' in line and 'failed:' in line:
                # Extract scenario counts
                scenarios = line.split('scenarios:')[1].split('passed:')
                results['scenarios'] = int(scenarios[0].strip())
                passed = scenarios[1].split('failed:')
                results['passed'] = int(passed[0].strip())
                results['failed'] = int(passed[1].strip())
            elif 'match failed' in line:
                results['errors'].append(line.strip())

        return results

    def archive_reports(self, run_id: str) -> Optional[Path]:
        """Archive reports for a specific test run."""
        if not self.reports_dir.exists():
            return None

        archive_dir = self.workspace_path / 'karate-archives' / run_id
        archive_dir.mkdir(parents=True, exist_ok=True)

        try:
            shutil.copytree(
                self.reports_dir,
                archive_dir / 'reports',
                dirs_exist_ok=True
            )
            return archive_dir
        except Exception:
            return None