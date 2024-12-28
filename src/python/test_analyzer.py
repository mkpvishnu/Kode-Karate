from pathlib import Path
from typing import Dict, List, Any, Optional
import re

class TestAnalyzer:
    def __init__(self):
        self._scenario_pattern = re.compile(r'\s*Scenario:(.+)')
        self._step_pattern = re.compile(r'\s*(Given|When|Then|And|But|\*)\s+(.+)')

    def analyze_feature_file(self, file_path: Path) -> Dict[str, Any]:
        """Analyze a Karate feature file and extract key information."""
        if not file_path.exists():
            raise FileNotFoundError(f"Feature file not found: {file_path}")

        analysis = {
            'feature': None,
            'scenarios': [],
            'background': [],
            'steps_count': 0,
            'complexity': 0
        }

        current_scenario = None
        in_background = False

        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                
                if not line or line.startswith('#'):
                    continue

                if line.startswith('Feature:'):
                    analysis['feature'] = line[8:].strip()
                elif line.startswith('Background:'):
                    in_background = True
                elif scenario_match := self._scenario_pattern.match(line):
                    in_background = False
                    if current_scenario:
                        analysis['scenarios'].append(current_scenario)
                    current_scenario = {
                        'name': scenario_match.group(1).strip(),
                        'steps': [],
                        'line_number': analysis['steps_count'] + 1
                    }
                elif step_match := self._step_pattern.match(line):
                    step = {
                        'keyword': step_match.group(1),
                        'text': step_match.group(2)
                    }
                    if in_background:
                        analysis['background'].append(step)
                    elif current_scenario:
                        current_scenario['steps'].append(step)
                    analysis['steps_count'] += 1

        if current_scenario:
            analysis['scenarios'].append(current_scenario)

        # Calculate complexity based on various factors
        analysis['complexity'] = self._calculate_complexity(analysis)

        return analysis

    def _calculate_complexity(self, analysis: Dict[str, Any]) -> int:
        """Calculate test complexity score."""
        complexity = 0
        
        # Base complexity from number of scenarios
        complexity += len(analysis['scenarios']) * 2

        # Add complexity for background steps
        complexity += len(analysis['background'])

        # Add complexity for each scenario's steps
        for scenario in analysis['scenarios']:
            complexity += len(scenario['steps'])
            
            # Additional complexity for data-driven scenarios
            if any('Examples:' in step['text'] for step in scenario['steps']):
                complexity += 5

            # Additional complexity for sophisticated assertions
            if any('match' in step['text'] for step in scenario['steps']):
                complexity += 2

        return complexity

    def analyze_test_results(self, output: str) -> Dict[str, Any]:
        """Analyze test execution output."""
        analysis = {
            'status': 'unknown',
            'error_details': [],
            'performance': [],
            'assertions': []
        }

        for line in output.split('\n'):
            line = line.strip()
            
            if 'failed:' in line:
                failed_count = int(re.search(r'failed:\s*(\d+)', line).group(1))
                analysis['status'] = 'failed' if failed_count > 0 else 'passed'
            
            if 'match failed' in line:
                analysis['error_details'].append(line)
            
            if 'response time' in line.lower():
                analysis['performance'].append(line)
            
            if 'match' in line and not 'failed' in line:
                analysis['assertions'].append(line)

        return analysis

    def get_scenario_names(self, file_path: Path) -> List[str]:
        """Get list of scenario names from a feature file."""
        scenarios = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if match := self._scenario_pattern.match(line):
                    scenarios.append(match.group(1).strip())
        return scenarios

    def find_scenario_line(self, file_path: Path, scenario_name: str) -> Optional[int]:
        """Find the line number for a specific scenario."""
        with open(file_path, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f, 1):
                if match := self._scenario_pattern.match(line):
                    if match.group(1).strip() == scenario_name:
                        return i
        return None

    def extract_variables(self, file_path: Path) -> List[Dict[str, str]]:
        """Extract variable definitions from a feature file."""
        variables = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('* def '):
                    var_def = line[6:].strip()
                    name = var_def.split('=')[0].strip()
                    value = var_def.split('=')[1].strip() if '=' in var_def else ''
                    variables.append({
                        'name': name,
                        'value': value
                    })
        return variables

    def suggest_improvements(self, analysis: Dict[str, Any]) -> List[str]:
        """Suggest improvements based on test analysis."""
        suggestions = []
        
        if analysis['complexity'] > 30:
            suggestions.append("Consider breaking down complex scenarios into smaller ones")

        if len(analysis['background']) > 5:
            suggestions.append("Background section is quite large. Consider moving some steps to shared feature files")

        for scenario in analysis['scenarios']:
            if len(scenario['steps']) > 10:
                suggestions.append(f"Scenario '{scenario['name']}' has many steps. Consider refactoring")

            has_assertions = any('match' in step['text'] for step in scenario['steps'])
            if not has_assertions:
                suggestions.append(f"Scenario '{scenario['name']}' lacks assertions. Consider adding verification steps")

        return suggestions