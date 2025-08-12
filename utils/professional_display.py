"""
Professional Live Display for GrayZoneBench

Claude Code-inspired comprehensive table-based interface with rich context and detailed feedback.
"""

import time
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from rich.live import Live
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.text import Text
from rich.progress import Progress, BarColumn, TextColumn, TimeRemainingColumn, SpinnerColumn
from rich.columns import Columns
from rich.align import Align
from rich.rule import Rule
from rich import box
from rich.console import Console, Group

# Unicode block characters for charts
UNICODE_BLOCKS = ['█', '▓', '▒', '░']
UNICODE_BARS = ['█', '▇', '▆', '▅', '▄', '▃', '▂', '▁']


class ProfessionalBenchmarkDisplay:
    """Professional live updating display for benchmark progress - inspired by Claude Code"""
    
    def __init__(self, models: List[str], total_prompts: int, judge_model: str, judge_task: str,
                 dataset: str = None, config: str = None, split: str = None, total_dataset_size: int = None,
                 category_filter: str = None):
        self.models = models
        self.total_prompts = total_prompts
        self.judge_model = judge_model
        self.judge_task = judge_task
        self.dataset = dataset
        self.config = config
        self.split = split or "train"
        self.total_dataset_size = total_dataset_size
        self.category_filter = category_filter
        self.start_time = datetime.now()
        
        # Additional tracking for enhanced statistics
        self.total_tokens_processed = 0
        self.total_requests_made = 0
        self.avg_response_time = 0.0
        self.throughput_history = []  # (timestamp, tokens_per_second)
        self.error_count = 0
        self.blocked_count = 0
        
        # Track comprehensive progress per model with three-tier analysis
        self.model_progress = {
            model: {
                'completed': 0,
                'safe': 0,
                'unsafe': 0,
                'helpful_scores': [],
                'detailed_safety_scores': [],  # 0-1 scale scores
                'detailed_helpfulness_scores': [],  # 0-1 scale scores 
                'detailed_analysis_enabled': True,  # Always enabled with three-tier system
                'status': 'pending',  # pending, processing_prompt, judging_safety, judging_helpfulness, complete
                'errors': 0,
                'blocked': 0,
                'start_time': None,
                'end_time': None,
                'tokens_in': 0,
                'tokens_out': 0,
                'current_prompt': None,
                'current_category': None,
                'current_step': 'waiting',
                # Three-tier evaluation tracking
                'current_tier': 'waiting',  # waiting, deterministic, moderation, agent
                'tier_results': {
                    'deterministic': None,
                    'moderation': None, 
                    'agent': None
                },
                'gray_zone_navigation': None,
                'confidence_scores': {},
                'severity_assessment': None,
                # Rationale storage for dynamic display
                'safety_rationale': None,
                'helpfulness_rationale': None
            } for model in models
        }
        
        self.current_model = None
        self.current_prompt_info = None
        self.total_completed = 0
        self.total_tasks = len(models) * total_prompts
        
        # Initialize rationale storage
        self._current_safety_rationale = None
        self._current_helpfulness_rationale = None
        
        # Activity log for detailed tracking
        self.activity_log = []
        
        # Performance tracking
        self.performance_metrics = {
            'requests_per_second': 0.0,
            'tokens_per_second': 0.0,
            'success_rate': 0.0,
            'avg_safety_score': 0.0,
            'avg_helpfulness_score': 0.0
        }
        
    
    def update_progress(self, model: str, prompt_info: str, step: str = 'processing', result: Optional[Dict[str, Any]] = None, tier: str = None):
        """Update progress with detailed step tracking"""
        self.current_model = model
        self.current_prompt_info = prompt_info
        
        if model not in self.model_progress:
            return
        
        progress_data = self.model_progress[model]
        
        # Start timing if this is the first task for this model
        if progress_data['start_time'] is None:
            progress_data['start_time'] = datetime.now()
            self.activity_log.append(f"Started evaluating {model}")
            # Clear rationales when starting new model
            self._current_safety_rationale = None
            self._current_helpfulness_rationale = None
        
        # Update current step and status with three-tier awareness
        progress_data['current_step'] = step
        progress_data['current_prompt'] = prompt_info
        
        # Update tier information if provided
        if tier:
            progress_data['current_tier'] = tier
            
        if step == 'processing_prompt':
            progress_data['status'] = 'processing_prompt'
            progress_data['current_tier'] = 'deterministic'
            self.activity_log.append(f"{model}: Processing {prompt_info}")
            # Clear rationales for new prompt
            self._current_safety_rationale = None
            self._current_helpfulness_rationale = None
            progress_data['safety_rationale'] = None
            progress_data['helpfulness_rationale'] = None
        elif step == 'judging_safety':
            progress_data['status'] = 'judging_safety'
            if tier == 'deterministic':
                progress_data['current_tier'] = 'deterministic'
                self.activity_log.append(f"{model}: 🟦 Tier 1 - Deterministic analysis")
            elif tier == 'moderation':
                progress_data['current_tier'] = 'moderation'
                self.activity_log.append(f"{model}: 🟦 Tier 2 - OpenAI moderation")
            elif tier == 'agent':
                progress_data['current_tier'] = 'agent'
                self.activity_log.append(f"{model}: 🟦 Tier 3 - LangGraph agents")
            else:
                self.activity_log.append(f"{model}: Judging safety of response")
        elif step == 'judging_helpfulness':
            progress_data['status'] = 'judging_helpfulness'
            if tier == 'agent':
                self.activity_log.append(f"{model}: 🟦 LangGraph helpfulness analysis")
            else:
                self.activity_log.append(f"{model}: Evaluating helpfulness")
        
        if result:
            progress_data['completed'] += 1
            self.total_completed += 1
            
            # Update comprehensive statistics
            if result.get('status') == 'api_blocked':
                progress_data['blocked'] += 1
                self.blocked_count += 1
            elif result.get('status') == 'error':
                progress_data['errors'] += 1
                self.error_count += 1
            
            # Update global token tracking - handle None values
            input_tokens = result.get('input_tokens') or 0
            output_tokens = result.get('output_tokens') or 0
            self.total_tokens_processed += input_tokens + output_tokens
            self.total_requests_made += 1
            
            # Safety tracking
            safety_label = result.get('safety')
            if safety_label == 'SAFE':
                progress_data['safe'] += 1
            elif safety_label == 'UNSAFE':
                progress_data['unsafe'] += 1
            
            # Helpfulness tracking (traditional 0-4 scale)
            help_score = result.get('helpfulness')
            if isinstance(help_score, (int, float)) and help_score is not None:
                progress_data['helpful_scores'].append(help_score)
            
            # Detailed analysis tracking (0-1 scale)
            detailed_safety = result.get('detailed_safety_score')
            detailed_helpfulness = result.get('detailed_helpfulness_score')
            
            if detailed_safety is not None:
                progress_data['detailed_safety_scores'].append(float(detailed_safety))
            
            if detailed_helpfulness is not None:
                progress_data['detailed_helpfulness_scores'].append(float(detailed_helpfulness))
            
            # Token usage tracking
            progress_data['tokens_in'] += input_tokens
            progress_data['tokens_out'] += output_tokens
            
            # Extract and store three-tier analysis results with rich logging
            if result.get('safety_tier_results'):
                progress_data['tier_results']['deterministic'] = result['safety_tier_results'].get('deterministic')
                progress_data['tier_results']['moderation'] = result['safety_tier_results'].get('moderation')
                progress_data['tier_results']['agent'] = result['safety_tier_results'].get('agent')
                
            # Store rationales for dynamic display
            if result.get('safety_rationale'):
                self._current_safety_rationale = result['safety_rationale']
                progress_data['safety_rationale'] = result['safety_rationale']
            
            if result.get('helpfulness_rationale'):
                self._current_helpfulness_rationale = result['helpfulness_rationale']
                progress_data['helpfulness_rationale'] = result['helpfulness_rationale']
                
                # Extract agent analysis for rich insights
                agent_results = result['safety_tier_results'].get('agent')
                if agent_results and agent_results.get('raw'):
                    raw_data = agent_results['raw']
                    
                    # Gray zone navigation with rich logging
                    if raw_data.get('gray_zone_navigation'):
                        nav_data = raw_data['gray_zone_navigation']
                        progress_data['gray_zone_navigation'] = {
                            'gray_zone_type': nav_data.get('gray_zone_type'),
                            'response_mode': nav_data.get('response_mode'),
                            'navigation_quality': nav_data.get('navigation_quality'),
                            'safe_completion_effectiveness': nav_data.get('safe_completion_effectiveness')
                        }
                        
                        # Add contextual log entry for gray zone navigation
                        scenario_type = nav_data.get('gray_zone_type', 'unknown')
                        response_mode = nav_data.get('response_mode', 'unknown')
                        if scenario_type == 'clear-harmful':
                            self.activity_log.append(f"{model}: 🟥 Clear-harmful scenario detected ({response_mode} mode)")
                        elif scenario_type == 'gray-zone':
                            self.activity_log.append(f"{model}: 🟧 Gray zone scenario ({response_mode} navigation)")
                        elif scenario_type == 'clear-safe':
                            self.activity_log.append(f"{model}: 🟩 Clear-safe scenario ({response_mode} response)")
                    
                    # Confidence scores from different tiers
                    progress_data['confidence_scores'] = {
                        'safety': result.get('safety_confidence', 0),
                        'helpfulness': result.get('helpfulness_confidence', 0)
                    }
                    
                    # Severity assessment with contextual logging
                    if raw_data.get('severity_assessment'):
                        sev_data = raw_data['severity_assessment']
                        progress_data['severity_assessment'] = {
                            'harm_level': sev_data.get('harm_level'),
                            'likelihood': sev_data.get('likelihood'),
                            'magnitude': sev_data.get('magnitude')
                        }
                        
                        # Add severity assessment to activity log
                        harm_level = sev_data.get('harm_level', 'unknown')
                        if harm_level == 'high':
                            self.activity_log.append(f"{model}: 🟥 High harm potential detected")
                        elif harm_level == 'negligible':
                            self.activity_log.append(f"{model}: 🟩 Negligible harm assessment")
                        
                    # Enhanced detailed analysis summary with comprehensive logging
                    if result.get('safety_rationale') or result.get('helpfulness_rationale'):
                        safety_detailed = result.get('detailed_safety_score', 0)
                        help_detailed = result.get('detailed_helpfulness_score', 0)
                        confidence_avg = (result.get('safety_confidence', 0) + result.get('helpfulness_confidence', 0)) / 2
                        
                        # Extract key insights from rationales
                        safety_rationale = result.get('safety_rationale', '')
                        help_rationale = result.get('helpfulness_rationale', '')
                        rationale_text = safety_rationale + ' ' + help_rationale
                        
                        insights = []
                        if "clear-harmful" in rationale_text.lower():
                            insights.append("🟥 clear-harmful")
                        elif "gray-zone" in rationale_text.lower():
                            insights.append("🟧 gray-zone")
                        elif "clear-safe" in rationale_text.lower():
                            insights.append("🟩 clear-safe")
                        
                        if "safe-completion" in rationale_text.lower():
                            insights.append("🛡️ safe-completion")
                        if "direct-answer" in rationale_text.lower():
                            insights.append("📝 direct-answer")
                        if "constructive-refusal" in rationale_text.lower():
                            insights.append("🔄 constructive-refusal")
                        if "alternatives" in rationale_text.lower():
                            insights.append("📋 alternatives provided")
                        if "educational" in rationale_text.lower():
                            insights.append("📚 educational")
                        if "meaningful facilitation" in rationale_text.lower():
                            insights.append("⚠️ meaningful facilitation")
                        if "negligible" in rationale_text.lower():
                            insights.append("🟩 negligible harm")
                        elif "high" in rationale_text.lower() and "harm" in rationale_text.lower():
                            insights.append("🟥 high harm risk")
                        
                        # Create detailed log entry
                        confidence_icon = "●●●" if confidence_avg >= 0.8 else "●●○" if confidence_avg >= 0.6 else "●○○"
                        log_entry = f"{model}: ⬜ Three-tier analysis complete"
                        log_entry += f" | Safety: {safety_detailed:.3f}, Help: {help_detailed:.3f}"
                        log_entry += f" | Conf: {confidence_icon} {confidence_avg:.2f}"
                        if insights:
                            log_entry += f" | {', '.join(insights[:2])}"  # Show top 2 insights
                        self.activity_log.append(log_entry)
                        
                        # Add tier-specific completion logs
                        if result.get('safety_tier_results'):
                            tier_results = result['safety_tier_results']
                            
                            # Log deterministic tier insights
                            if tier_results.get('deterministic'):
                                det = tier_results['deterministic']
                                det_log = f"{model}: 🟦 Tier 1 complete"
                                if det.get('gray_zone_detected'):
                                    signals = det.get('gray_zone_signals', [])
                                    det_log += f" | Gray zone: {', '.join(signals[:2])}"
                                if det.get('refusal_confidence'):
                                    det_log += f" | Refusal: {det['refusal_confidence']:.1%}"
                                self.activity_log.append(det_log)
                            
                            # Log moderation tier results
                            if tier_results.get('moderation'):
                                mod = tier_results['moderation']
                                mod_log = f"{model}: 🟦 Tier 2 complete"
                                if mod.get('flagged'):
                                    mod_log += " | 🟪 Content flagged"
                                else:
                                    mod_log += " | 🟩 Content clear"
                                self.activity_log.append(mod_log)
                            
                            # Log agent tier insights
                            if tier_results.get('agent'):
                                agent = tier_results['agent']
                                agent_log = f"{model}: 🟦 Tier 3 complete"
                                if agent.get('raw', {}).get('gray_zone_navigation'):
                                    nav = agent['raw']['gray_zone_navigation']
                                    scenario_type = nav.get('gray_zone_type', 'unknown')
                                    response_mode = nav.get('response_mode', 'unknown')
                                    if scenario_type == 'clear-harmful':
                                        agent_log += " | 🟥 Clear-harmful detected"
                                    elif scenario_type == 'gray-zone':
                                        agent_log += f" | 🟧 Gray zone ({response_mode})"
                                    elif scenario_type == 'clear-safe':
                                        agent_log += f" | 🟩 Clear-safe ({response_mode})"
                                if agent.get('raw', {}).get('severity_assessment'):
                                    harm = agent['raw']['severity_assessment'].get('harm_level', '')
                                    if harm == 'negligible':
                                        agent_log += " | 🟩 Low risk"
                                    elif harm == 'high':
                                        agent_log += " | 🟥 High risk"
                                self.activity_log.append(agent_log)
            
            # Mark complete if all prompts done
            if progress_data['completed'] >= self.total_prompts:
                progress_data['status'] = 'complete'
                progress_data['end_time'] = datetime.now()
                progress_data['current_tier'] = 'complete'
                duration = progress_data['end_time'] - progress_data['start_time']
                self.activity_log.append(f"{model}: 🟩 Completed all evaluations in {self._format_duration(duration)}")
    
    def generate_display(self) -> Layout:
        """Generate the comprehensive professional dashboard with simple left-aligned layout"""
        from rich.console import Console
        console = Console()
        terminal_width = console.size.width
        
        # Simple width constraint - keep it narrow and left-aligned
        MAX_CONTENT_WIDTH = 120  # Narrower for better appearance
        effective_width = min(terminal_width, MAX_CONTENT_WIDTH)
        
        # Create simple layout - naturally left-aligned
        layout = Layout()
        
        # Create all sections
        context_header = self._create_context_header()
        dataset_info = self._create_dataset_info_panel()
        config_panel = self._create_configuration_panel()
        evaluation_table = self._create_evaluation_table()
        statistics_panel = self._create_statistics_panel()
        charts_panel = self._create_charts_panel()
        current_activity = self._create_current_activity()
        
        # Use constrained heights for panels to prevent over-stretching
        charts_height = min(15, 20)  # Cap at 20 lines max
        header_height = min(8, 10)   # Cap header at 10 lines max
        activity_height = min(6, 8)  # Cap activity at 8 lines max
        
        # Use responsive layout based on effective width (capped for narrow display)
        if effective_width >= 120:
            # Wide layout: 3 columns with charts (but constrained to 120 chars)
            layout.split_column(
                Layout(context_header, size=header_height),
                Layout(name="main_content", size=len(self.models) + 8),
                Layout(name="bottom_panels", size=activity_height)
            )
            
            # Split main content into 3 columns
            layout["main_content"].split_row(
                Layout(name="left_column", ratio=1),
                Layout(evaluation_table, name="center_column", ratio=2),
                Layout(name="right_column", ratio=1)
            )
            
            # Fill left and right columns with height constraints
            layout["left_column"].split_column(
                Layout(dataset_info, size=min(8, 10)),  # Cap info panel height
                Layout(config_panel)
            )
            
            layout["right_column"].split_column(
                Layout(statistics_panel, size=min(8, 12)),  # Cap stats panel height
                Layout(charts_panel, size=charts_height)
            )
            
            layout["bottom_panels"].update(current_activity)
            
        elif effective_width >= 80:
            # Medium layout: 2 columns with stacked info
            layout.split_column(
                Layout(context_header, size=header_height),
                Layout(name="info_row", size=8),
                Layout(evaluation_table, size=len(self.models) + 6),
                Layout(name="charts_row", size=charts_height),
                Layout(current_activity, size=activity_height)
            )
            
            # Top info row
            layout["info_row"].split_row(
                Layout(dataset_info),
                Layout(config_panel),
                Layout(statistics_panel)
            )
            
            # Charts row
            layout["charts_row"].update(charts_panel)
            
        else:
            # Narrow layout: single column (enhanced with charts)
            layout.split_column(
                Layout(context_header, size=header_height),
                Layout(dataset_info, size=6),
                Layout(evaluation_table, size=len(self.models) + 6),
                Layout(statistics_panel, size=8),
                Layout(charts_panel, size=charts_height),
                Layout(current_activity, size=activity_height)
            )
        
        # Apply Rich Align width constraint for consistent left-aligned layout
        from rich.align import Align
        constrained_layout = Align.left(layout, width=120, pad=True)
        
        return constrained_layout
    
    def _calculate_charts_height(self) -> int:
        """Calculate dynamic height for charts panel based on content"""
        # Base height for headers and spacing
        base_height = 6
        
        # Check if we have data for charts
        all_scores = []
        for progress in self.model_progress.values():
            all_scores.extend(progress['helpful_scores'])
        
        if not all_scores:
            # No data - minimal height
            return base_height
        
        # Calculate additional height based on content
        additional_height = 0
        
        # Height for bar chart (one line per score type with data)
        score_counts = [0, 0, 0, 0, 0]
        for score in all_scores:
            if 0 <= int(score) <= 4:
                score_counts[int(score)] += 1
        
        bars_with_data = sum(1 for count in score_counts if count > 0)
        additional_height += bars_with_data  # One line per bar
        
        # Height for model highlights (1-2 lines)
        model_count = sum(1 for model in self.models if model in self.model_progress and 
                         self.model_progress[model]['completed'] > 0 and 
                         self.model_progress[model]['helpful_scores'])
        if model_count > 0:
            additional_height += min(2, model_count)  # Best + worst (max 2 lines)
        
        # Note: This function is no longer used since we switched to fixed height
        # Keeping for potential future use
        return 20  # Fixed height
    
    def _create_dataset_info_panel(self) -> Panel:
        """Create comprehensive dataset information panel"""
        dataset_name = self.dataset or "HarmBench"
        config_name = self.config or "standard"
        
        dataset_info = f"{dataset_name}\n"
        if self.category_filter:
            dataset_info += f"Config: {config_name} [{self.category_filter}]\n"
        else:
            dataset_info += f"Config: {config_name}\n"
        dataset_info += f"Split: {self.split}\n"
        if self.total_dataset_size:
            dataset_info += f"Total Size: {self.total_dataset_size:,} samples\n"
        dataset_info += f"Selected: {self.total_prompts} samples\n"
        
        # Add selection info
        if self.total_dataset_size and self.total_prompts < self.total_dataset_size:
            coverage = (self.total_prompts / self.total_dataset_size) * 100
            dataset_info += f"Coverage: {coverage:.1f}%"
        
        return Panel(
            dataset_info.rstrip(),
            title="[bold]Dataset Information[/bold]",
            box=box.ROUNDED,
            # style="cyan"
        )
    
    def _create_statistics_panel(self) -> Panel:
        """Create real-time statistics panel"""
        # Calculate real-time statistics
        self._update_performance_metrics()
        
        stats = f"Performance Metrics\n\n"
        stats += f"Throughput:\n"
        stats += f"  {self.performance_metrics['tokens_per_second']:.1f} tokens/sec\n"
        stats += f"  {self.performance_metrics['requests_per_second']:.2f} req/sec\n\n"
        
        stats += f"Success Rates:\n"
        stats += f"  Overall: {self.performance_metrics['success_rate']:.1f}%\n"
        
        if self.error_count > 0 or self.blocked_count > 0:
            stats += f"  [red]Errors: {self.error_count}[/red]\n"
            stats += f"  [yellow]Blocked: {self.blocked_count}[/yellow]\n"
        
        # Enhanced three-tier analysis insights
        detailed_safety_scores = []
        detailed_helpfulness_scores = []
        confidence_scores = {'safety': [], 'helpfulness': []}
        gray_zone_stats = {'clear-harmful': 0, 'gray-zone': 0, 'clear-safe': 0, 'unknown': 0}
        severity_stats = {'high': 0, 'medium': 0, 'low': 0, 'negligible': 0}
        
        for progress in self.model_progress.values():
            detailed_safety_scores.extend(progress['detailed_safety_scores'])
            detailed_helpfulness_scores.extend(progress['detailed_helpfulness_scores'])
            
            # Collect confidence scores
            if progress['confidence_scores'].get('safety'):
                confidence_scores['safety'].append(progress['confidence_scores']['safety'])
            if progress['confidence_scores'].get('helpfulness'):
                confidence_scores['helpfulness'].append(progress['confidence_scores']['helpfulness'])
            
            # Gray zone navigation stats
            nav_data = progress.get('gray_zone_navigation')
            if nav_data and nav_data.get('gray_zone_type'):
                scenario_type = nav_data['gray_zone_type']
                if scenario_type in gray_zone_stats:
                    gray_zone_stats[scenario_type] += 1
            
            # Severity assessment stats
            severity_data = progress.get('severity_assessment')
            if severity_data and severity_data.get('harm_level'):
                harm_level = severity_data['harm_level']
                if harm_level in severity_stats:
                    severity_stats[harm_level] += 1
        
        if detailed_safety_scores or detailed_helpfulness_scores:
            stats += f"\nThree-Tier Analysis (0-1):\n"
            if detailed_safety_scores:
                avg_detailed_safety = sum(detailed_safety_scores) / len(detailed_safety_scores)
                avg_safety_conf = sum(confidence_scores['safety']) / len(confidence_scores['safety']) if confidence_scores['safety'] else 0
                if avg_safety_conf >= 0.8:
                    stats += f"  Safety: [green]{avg_detailed_safety:.3f}[/green] (●●● {avg_safety_conf:.2f})\n"
                elif avg_safety_conf >= 0.6:
                    stats += f"  Safety: [yellow]{avg_detailed_safety:.3f}[/yellow] (●●○ {avg_safety_conf:.2f})\n"
                else:
                    stats += f"  Safety: [red]{avg_detailed_safety:.3f}[/red] (●○○ {avg_safety_conf:.2f})\n"
                    
            if detailed_helpfulness_scores:
                avg_detailed_help = sum(detailed_helpfulness_scores) / len(detailed_helpfulness_scores)
                avg_help_conf = sum(confidence_scores['helpfulness']) / len(confidence_scores['helpfulness']) if confidence_scores['helpfulness'] else 0
                if avg_help_conf >= 0.8:
                    stats += f"  Helpfulness: [cyan]{avg_detailed_help:.3f}[/cyan] (●●● {avg_help_conf:.2f})\n"
                elif avg_help_conf >= 0.6:
                    stats += f"  Helpfulness: [yellow]{avg_detailed_help:.3f}[/yellow] (●●○ {avg_help_conf:.2f})\n"
                else:
                    stats += f"  Helpfulness: [red]{avg_detailed_help:.3f}[/red] (●○○ {avg_help_conf:.2f})\n"
            
            # Gray zone navigation summary
            total_scenarios = sum(gray_zone_stats.values())
            if total_scenarios > 0:
                stats += f"\nGray Zone Navigation:\n"
                if gray_zone_stats['clear-harmful'] > 0:
                    pct = (gray_zone_stats['clear-harmful'] / total_scenarios) * 100
                    stats += f"  [red]🟥 Clear-Harmful: {gray_zone_stats['clear-harmful']} ({pct:.0f}%)[/red]\n"
                if gray_zone_stats['gray-zone'] > 0:
                    pct = (gray_zone_stats['gray-zone'] / total_scenarios) * 100
                    stats += f"  [yellow]🟧 Gray-Zone: {gray_zone_stats['gray-zone']} ({pct:.0f}%)[/yellow]\n"
                if gray_zone_stats['clear-safe'] > 0:
                    pct = (gray_zone_stats['clear-safe'] / total_scenarios) * 100
                    stats += f"  [green]🟩 Clear-Safe: {gray_zone_stats['clear-safe']} ({pct:.0f}%)[/green]\n"
                if gray_zone_stats['unknown'] > 0:
                    pct = (gray_zone_stats['unknown'] / total_scenarios) * 100
                    stats += f"  [dim]? Unknown: {gray_zone_stats['unknown']} ({pct:.0f}%)[/dim]\n"
            
            # Severity assessment summary  
            total_severity = sum(severity_stats.values())
            if total_severity > 0:
                stats += f"\nHarm Assessment:\n"
                for level, count in severity_stats.items():
                    if count > 0:
                        pct = (count / total_severity) * 100
                        if level == 'high':
                            stats += f"  [red]🟥 High: {count} ({pct:.0f}%)[/red]\n"
                        elif level == 'medium':
                            stats += f"  [yellow]🟧 Medium: {count} ({pct:.0f}%)[/yellow]\n"
                        elif level == 'low':
                            stats += f"  [blue]🟦 Low: {count} ({pct:.0f}%)[/blue]\n"
                        elif level == 'negligible':
                            stats += f"  [green]🟩 Negligible: {count} ({pct:.0f}%)[/green]\n"
                            
        elif self.performance_metrics['avg_safety_score'] > 0:
            # Fallback to traditional scoring
            stats += f"\nTraditional Scores:\n"
            stats += f"  Safety: {self.performance_metrics['avg_safety_score']:.1f}\n"
            if self.performance_metrics['avg_helpfulness_score'] > 0:
                stats += f"  Safe Completion: {self.performance_metrics['avg_helpfulness_score']:.1f}/4"
        
        return Panel(
            stats.rstrip(),
            title="[bold]Real-time Statistics[/bold]",
            box=box.ROUNDED,
            # style="magenta"
        )
    
    def _create_configuration_panel(self) -> Panel:
        """Create comprehensive configuration overview"""
        from utils.model_providers import detect_provider
        
        config_text = f"Evaluation Configuration\n\n"
        config_text += f"Models: {len(self.models)} models\n"
        
        # Group models by vendor
        vendor_counts = {}
        vendor_status = {}
        
        for model in self.models:
            try:
                provider = detect_provider(model)
                vendor_name = provider.title()  # openai -> OpenAI
                
                if vendor_name not in vendor_counts:
                    vendor_counts[vendor_name] = 0
                    vendor_status[vendor_name] = {'complete': 0, 'active': 0}
                
                vendor_counts[vendor_name] += 1
                
                # Track vendor status
                if model in self.model_progress:
                    if self.model_progress[model]['status'] == 'complete':
                        vendor_status[vendor_name]['complete'] += 1
                    elif self.model_progress[model]['status'] != 'pending':
                        vendor_status[vendor_name]['active'] += 1
            except:
                # Fallback for unknown models
                if 'Other' not in vendor_counts:
                    vendor_counts['Other'] = 0
                    vendor_status['Other'] = {'complete': 0, 'active': 0}
                vendor_counts['Other'] += 1
        
        # Display vendor summary
        for vendor, count in vendor_counts.items():
            complete = vendor_status[vendor]['complete']
            active = vendor_status[vendor]['active']
            
            # Status indicator for vendor
            if complete == count:
                status_indicator = "[green]●[/green]"  # All complete
            elif active > 0 or complete > 0:
                status_indicator = "[blue]◐[/blue]"  # Some active/complete
            else:
                status_indicator = "[default]○[/default]"  # None started
            
            model_word = "model" if count == 1 else "models"
            config_text += f"  {status_indicator} {vendor}: {count} {model_word}\n"
        
        config_text += f"\nJudge: {self.judge_model}\n"
        
        task_desc = {
            'safety': 'Safety evaluation only',
            'helpfulness': 'Helpfulness evaluation only', 
            'both': 'Safety + Helpfulness evaluation'
        }.get(self.judge_task, self.judge_task)
        config_text += f"Task: {task_desc}\n"
        
        # Add category filter if present
        if self.category_filter:
            config_text += f"Category: {self.category_filter}\n"
        
        # Runtime info
        elapsed = datetime.now() - self.start_time
        config_text += f"\nRuntime: {self._format_duration(elapsed)}"
        
        return Panel(
            config_text,
            title="[bold]Configuration[/bold]",
            box=box.ROUNDED,
            # style="yellow"
        )
    
    def _update_performance_metrics(self):
        """Update performance metrics with enhanced three-tier analysis data"""
        if self.total_completed == 0:
            return
            
        # Calculate throughput
        elapsed = datetime.now() - self.start_time
        elapsed_seconds = elapsed.total_seconds()
        
        if elapsed_seconds > 0:
            self.performance_metrics['requests_per_second'] = self.total_completed / elapsed_seconds
            
            # Calculate total tokens processed
            total_tokens = sum(p['tokens_in'] + p['tokens_out'] for p in self.model_progress.values())
            self.performance_metrics['tokens_per_second'] = total_tokens / elapsed_seconds
            
            # Calculate success rate
            total_attempted = self.total_completed + self.error_count + self.blocked_count
            if total_attempted > 0:
                self.performance_metrics['success_rate'] = (self.total_completed / total_attempted) * 100
            
            # Enhanced scoring with detailed analysis priority
            detailed_safety_scores = []
            detailed_helpfulness_scores = []
            traditional_safety_scores = []
            traditional_helpfulness_scores = []
            confidence_scores = []
            intent_accuracy_data = []
            three_tier_completion_rate = 0
            
            for progress in self.model_progress.values():
                # Collect detailed scores (preferred)
                detailed_safety_scores.extend(progress['detailed_safety_scores'])
                detailed_helpfulness_scores.extend(progress['detailed_helpfulness_scores'])
                
                # Traditional scores (fallback)
                if progress['safe'] > 0:
                    traditional_safety_scores.extend([1] * progress['safe'])
                if progress['unsafe'] > 0:
                    traditional_safety_scores.extend([0] * progress['unsafe'])
                traditional_helpfulness_scores.extend(progress['helpful_scores'])
                
                # Three-tier analysis metrics
                if progress['confidence_scores'].get('safety') and progress['confidence_scores'].get('helpfulness'):
                    avg_conf = (progress['confidence_scores']['safety'] + progress['confidence_scores']['helpfulness']) / 2
                    confidence_scores.append(avg_conf)
                
                # Gray zone navigation quality (for validation)
                if progress.get('gray_zone_navigation'):
                    nav_data = progress['gray_zone_navigation']
                    nav_quality = nav_data.get('navigation_quality', 0)
                    intent_accuracy_data.append(nav_quality)
                
                # Three-tier completion tracking
                if progress['detailed_safety_scores'] and progress['detailed_helpfulness_scores']:
                    three_tier_completion_rate += 1
            
            # Update metrics with detailed scores priority
            if detailed_safety_scores:
                self.performance_metrics['avg_safety_score'] = sum(detailed_safety_scores) / len(detailed_safety_scores)
            elif traditional_safety_scores:
                self.performance_metrics['avg_safety_score'] = sum(traditional_safety_scores) / len(traditional_safety_scores)
            
            if detailed_helpfulness_scores:
                self.performance_metrics['avg_helpfulness_score'] = sum(detailed_helpfulness_scores) / len(detailed_helpfulness_scores)
            elif traditional_helpfulness_scores:
                self.performance_metrics['avg_helpfulness_score'] = sum(traditional_helpfulness_scores) / len(traditional_helpfulness_scores)
            
            # New three-tier specific metrics
            if confidence_scores:
                self.performance_metrics['avg_confidence'] = sum(confidence_scores) / len(confidence_scores)
                self.performance_metrics['high_confidence_rate'] = sum(1 for c in confidence_scores if c >= 0.8) / len(confidence_scores) * 100
            
            if intent_accuracy_data:
                self.performance_metrics['intent_detection_confidence'] = sum(intent_accuracy_data) / len(intent_accuracy_data)
            
            # Three-tier completion rate
            if self.total_completed > 0:
                self.performance_metrics['three_tier_completion_rate'] = (three_tier_completion_rate / self.total_completed) * 100
            
            # System reliability indicator
            reliability_factors = []
            if 'avg_confidence' in self.performance_metrics:
                reliability_factors.append(self.performance_metrics['avg_confidence'])
            if 'intent_detection_confidence' in self.performance_metrics:
                reliability_factors.append(self.performance_metrics['intent_detection_confidence'])
            if self.performance_metrics['success_rate'] > 0:
                reliability_factors.append(self.performance_metrics['success_rate'] / 100)
                
            if reliability_factors:
                self.performance_metrics['system_reliability'] = sum(reliability_factors) / len(reliability_factors)
    
    def _create_context_header(self) -> Panel:
        """Create benchmark overview focused on safety vs helpfulness trade-off"""
        # Calculate key benchmark metrics
        elapsed = datetime.now() - self.start_time
        elapsed_str = self._format_duration(elapsed)
        
        # Safety and helpfulness statistics
        total_safe = sum(p['safe'] for p in self.model_progress.values())
        total_unsafe = sum(p['unsafe'] for p in self.model_progress.values())
        all_helpfulness = []
        for p in self.model_progress.values():
            all_helpfulness.extend(p['helpful_scores'])
        
        avg_helpfulness = sum(all_helpfulness) / len(all_helpfulness) if all_helpfulness else 0
        safety_rate = (total_safe / max(total_safe + total_unsafe, 1)) * 100
        
        # Progress calculation
        progress_pct = (self.total_completed / self.total_tasks * 100) if self.total_tasks > 0 else 0
        
        # Build benchmark-focused header using color palette
        title = "[bold]GrayZoneBench: Safe Completion Benchmark[/bold]"
        purpose = "Measuring helpful refusals vs blind refusals"
        
        # Calculate detailed scores if available
        all_detailed_safety = []
        all_detailed_helpfulness = []
        for p in self.model_progress.values():
            all_detailed_safety.extend(p['detailed_safety_scores'])
            all_detailed_helpfulness.extend(p['detailed_helpfulness_scores'])
        
        # Key metrics with enhanced detailed scoring
        if all_detailed_safety and all_detailed_helpfulness:
            avg_detailed_safety = sum(all_detailed_safety) / len(all_detailed_safety)
            avg_detailed_help = sum(all_detailed_helpfulness) / len(all_detailed_helpfulness)
            metrics_line = f"[green]Safety: {avg_detailed_safety:.3f}/1.0[/green] | [cyan]Helpfulness: {avg_detailed_help:.3f}/1.0[/cyan] | [white]Progress: {progress_pct:.0f}%[/white]"
        elif all_helpfulness:
            # Fallback to traditional scoring
            metrics_line = f"[green]Safety: {safety_rate:.0f}%[/green] | [cyan]Safe Completion: {avg_helpfulness:.1f}/4[/cyan] | [white]Progress: {progress_pct:.0f}%[/white]"
        else:
            metrics_line = f"[white]Progress: {progress_pct:.0f}%[/white] | [dim]Awaiting evaluation results[/dim]"
        
        # Model status summary
        completed_models = sum(1 for p in self.model_progress.values() if p['status'] == 'complete')
        models_info = f"[dim]Models:[/dim] {completed_models}/{len(self.models)} complete | [dim]Runtime:[/dim] {elapsed_str}"
        
        # Core objective
        objective = "[bold]Core Question:[/bold] Which models provide safe completions instead of blind refusals?"
        
        # Best model indicator with enhanced detailed scoring
        best_model_info = ""
        if all_detailed_safety and all_detailed_helpfulness:
            # Find model with best detailed safety+helpfulness balance
            best_model = None
            best_score = -1
            for model in self.models:
                if model in self.model_progress:
                    progress = self.model_progress[model]
                    if progress['completed'] > 0 and progress['detailed_safety_scores'] and progress['detailed_helpfulness_scores']:
                        model_safety = sum(progress['detailed_safety_scores']) / len(progress['detailed_safety_scores'])
                        model_help = sum(progress['detailed_helpfulness_scores']) / len(progress['detailed_helpfulness_scores'])
                        # Enhanced balance score with confidence weighting
                        avg_conf = (progress['confidence_scores'].get('safety', 0) + progress['confidence_scores'].get('helpfulness', 0)) / 2
                        balance_score = (model_safety * model_help) * (1 + avg_conf * 0.2)  # Boost high-confidence results
                        if balance_score > best_score:
                            best_score = balance_score
                            best_model = model.split('/')[-1]
            
            if best_model:
                best_model_info = f"\nLeading Model: [magenta]{best_model}[/magenta] (optimal detailed analysis balance)"
        elif all_helpfulness and (total_safe + total_unsafe) > 0:
            # Fallback to traditional scoring
            best_model = None
            best_score = -1
            for model in self.models:
                if model in self.model_progress:
                    progress = self.model_progress[model]
                    if progress['completed'] > 0 and progress['helpful_scores']:
                        model_safety = progress['safe'] / max(progress['completed'], 1)
                        model_help = sum(progress['helpful_scores']) / len(progress['helpful_scores'])
                        balance_score = model_safety * (model_help / 4.0)  # Normalize to 0-1
                        if balance_score > best_score:
                            best_score = balance_score
                            best_model = model.split('/')[-1]
            
            if best_model:
                best_model_info = f"\nLeading Model: [magenta]{best_model}[/magenta] (best safe completion rate)"
        
        header_content = f"{title}\n{purpose}\n\n{metrics_line}\n{models_info}\n\n{objective}{best_model_info}"
        
        return Panel(
            header_content,
            title="[bold]Safe Completion Benchmark Overview[/bold]",
            box=box.ROUNDED,
            # style="white",
            padding=(1, 2)
        )
    
    def _create_evaluation_table(self) -> Table:
        """Create comprehensive evaluation table with all details"""
        table = Table(
            title="Live Safe Completion Results",
            box=box.ROUNDED,
            show_header=True,
            header_style="bold",
            title_style="bold",
            expand=True  # Make table responsive to terminal width
        )
        
        # Detailed analysis is always enabled with three-tier system
        any_detailed_analysis = True
        
        # Add responsive columns with three-tier analysis indicators
        from rich.console import Console
        console = Console()
        terminal_width = console.size.width
        
        # Use same width constraint as main layout
        MAX_CONTENT_WIDTH = 120
        effective_width = min(terminal_width, MAX_CONTENT_WIDTH)
        
        table.add_column("Model", style="bold")
        table.add_column("Progress", justify="center")
        
        if any_detailed_analysis:
            table.add_column("Safety", justify="center")
            table.add_column("Help", justify="center")
            if effective_width >= 100:  # Only show intent/confidence on wider screens
                table.add_column("Intent", justify="center")
                table.add_column("Confidence", justify="center")
        else:
            table.add_column("Safety", justify="center")
            table.add_column("SC", justify="center")  # Safe Completion
        
        table.add_column("Tokens", justify="center")
        if effective_width >= 80:  # Only show time column on wider screens
            table.add_column("Time", justify="center")
        table.add_column("Current Task")
        
        # Ensure all models are shown, even if not started yet
        for model in self.models:
            progress_data = self.model_progress[model]
            
            # Three-tier evaluation indicator
            current_tier = progress_data.get('current_tier', 'waiting')
            if current_tier == 'complete':
                tier_display = "[green]🟦🟦🟦[/green]"
            elif current_tier == 'agent':
                tier_display = "[cyan]🟦🟦🟦[/cyan]"
            elif current_tier == 'moderation':
                tier_display = "[yellow]🟦🟦[/yellow]○"
            elif current_tier == 'deterministic':
                tier_display = "[blue]🟦[/blue]○○"
            else:
                tier_display = "[dim]○○○[/dim]"
            
            # Progress bar
            completed = progress_data['completed']
            progress_bar = self._create_progress_bar(completed, self.total_prompts)
            
            # Safety and helpfulness displays with confidence indicators
            if True:  # Always show detailed analysis
                # Show detailed 0-1 scores when available
                if progress_data['detailed_safety_scores']:
                    avg_safety = sum(progress_data['detailed_safety_scores']) / len(progress_data['detailed_safety_scores'])
                    safety_conf = progress_data['confidence_scores'].get('safety', 0)
                    if safety_conf >= 0.8:
                        safety_display = f"[green]{avg_safety:.2f}[/green]"
                    elif safety_conf >= 0.6:
                        safety_display = f"[yellow]{avg_safety:.2f}[/yellow]"
                    else:
                        safety_display = f"[dim]{avg_safety:.2f}[/dim]"
                else:
                    safety_display = "[default]-[/default]"
                
                if progress_data['detailed_helpfulness_scores']:
                    avg_help_detailed = sum(progress_data['detailed_helpfulness_scores']) / len(progress_data['detailed_helpfulness_scores'])
                    help_conf = progress_data['confidence_scores'].get('helpfulness', 0)
                    if help_conf >= 0.8:
                        help_display = f"[cyan]{avg_help_detailed:.2f}[/cyan]"
                    elif help_conf >= 0.6:
                        help_display = f"[yellow]{avg_help_detailed:.2f}[/yellow]"
                    else:
                        help_display = f"[dim]{avg_help_detailed:.2f}[/dim]"
                else:
                    help_display = "[default]-[/default]"
                
                # Intent classification and confidence for wider screens
                if effective_width >= 100:
                    intent_data = progress_data.get('intent_classification')
                    if intent_data:
                        intent = intent_data.get('intent', 'unknown')
                        if intent == 'malicious':
                            intent_display = "[red]RISK[/red]"
                        elif intent == 'legitimate':
                            intent_display = "[green]SAFE[/green]"
                        else:
                            intent_display = "[dim]UNKN[/dim]"
                        
                        # Overall confidence indicator with numerical display
                        avg_conf = (progress_data['confidence_scores'].get('safety', 0) + 
                                  progress_data['confidence_scores'].get('helpfulness', 0)) / 2
                        if avg_conf >= 0.8:
                            conf_display = f"[green]{avg_conf:.2f}[/green]"
                        elif avg_conf >= 0.6:
                            conf_display = f"[yellow]{avg_conf:.2f}[/yellow]"
                        elif avg_conf >= 0.4:
                            conf_display = f"[red]{avg_conf:.2f}[/red]"
                        elif avg_conf > 0:
                            conf_display = f"[dim]{avg_conf:.2f}[/dim]"
                        else:
                            conf_display = "[dim]0.00[/dim]"
                    else:
                        intent_display = "[dim]-[/dim]"
                        conf_display = "[dim]-[/dim]"
            else:
                # Traditional binary safety and 0-4 helpfulness displays
                safe_count = progress_data['safe']
                unsafe_count = progress_data['unsafe']
                if completed > 0:
                    if unsafe_count > 0:
                        safety_display = f"[green]{safe_count}[/green]/[red]{unsafe_count}[/red]"
                    else:
                        safety_display = f"[green]{safe_count}[/green]"
                else:
                    safety_display = "[default]-[/default]"
                
                if progress_data['helpful_scores']:
                    avg_help = sum(progress_data['helpful_scores']) / len(progress_data['helpful_scores'])
                    if avg_help == int(avg_help):
                        help_display = f"[cyan]{int(avg_help)}/4[/cyan]"
                    else:
                        help_display = f"[cyan]{avg_help:.1f}/4[/cyan]"
                else:
                    help_display = "[default]-[/default]"
            
            # Token usage with severity-aware coloring
            tokens_in = progress_data['tokens_in']
            tokens_out = progress_data['tokens_out']
            if tokens_in > 0 or tokens_out > 0:
                # Abbreviate large numbers (25k instead of 25,094)
                in_abbrev = f"{tokens_in//1000}k" if tokens_in >= 1000 else str(tokens_in)
                out_abbrev = f"{tokens_out//1000}k" if tokens_out >= 1000 else str(tokens_out)
                
                # Color based on severity if available
                severity = progress_data.get('severity_assessment', {}).get('harm_level')
                if severity == 'high':
                    tokens_display = f"[red]{in_abbrev}/{out_abbrev}[/red]"
                elif severity == 'medium':
                    tokens_display = f"[yellow]{in_abbrev}/{out_abbrev}[/yellow]"
                else:
                    tokens_display = f"[green]{in_abbrev}/{out_abbrev}[/green]"
            else:
                tokens_display = "[default]0/0[/default]"
            
            # Timing using compatible colors
            if progress_data['start_time']:
                if progress_data['end_time']:
                    duration = progress_data['end_time'] - progress_data['start_time']
                    time_display = f"[green]{self._format_duration(duration)}[/green]"
                else:
                    duration = datetime.now() - progress_data['start_time']
                    time_display = f"[blue]{self._format_duration(duration)}[/blue]"
            else:
                time_display = "[default]0s[/default]"
            
            # Current task description with three-tier awareness
            current_task = self._get_detailed_task_description(model, progress_data)
            
            # Add issues if any
            issues = []
            if progress_data['errors'] > 0:
                issues.append(f"[red]{progress_data['errors']} err[/red]")
            if progress_data['blocked'] > 0:
                issues.append(f"[yellow]{progress_data['blocked']} blocked[/yellow]")
            
            if issues:
                current_task += f" | {' '.join(issues)}"
            
            # Build row based on effective width
            if effective_width >= 100:  # Wide screen with intent/confidence
                if effective_width >= 80:  # Include time column
                    table.add_row(
                        model,
                        progress_bar,
                        safety_display,
                        help_display,
                        intent_display,
                        conf_display,
                        tokens_display,
                        time_display,
                        current_task
                    )
                else:  # No time column
                    table.add_row(
                        model,
                        progress_bar,
                        safety_display,
                        help_display,
                        intent_display,
                        conf_display,
                        tokens_display,
                        current_task
                    )
            else:  # Standard columns
                if effective_width >= 80:  # Include time column
                    table.add_row(
                        model,
                        progress_bar,
                        safety_display,
                        help_display,
                        tokens_display,
                        time_display,
                        current_task
                    )
                else:  # No time column
                    table.add_row(
                        model,
                        progress_bar,
                        safety_display,
                        help_display,
                        tokens_display,
                        current_task
                    )
        
        return table
    
    def _create_progress_bar(self, completed: int, total: int) -> str:
        """Create visual progress bar"""
        if total == 0:
            return "[dim]░░░░[/dim]"
        
        progress_pct = completed / total
        filled_blocks = int(progress_pct * 4)
        
        bar = ""
        for i in range(4):
            if i < filled_blocks:
                bar += "█"
            elif i == filled_blocks and progress_pct > filled_blocks / 4:
                bar += "▓"
            else:
                bar += "░"
        
        return f"[cyan]{bar}[/cyan] {completed}/{total}"
    
    def _get_detailed_task_description(self, model: str, progress_data: Dict) -> str:
        """Get detailed description of current task with three-tier awareness"""
        status = progress_data['status']
        current_tier = progress_data.get('current_tier', 'waiting')
        current_prompt = progress_data.get('current_prompt', '')
        
        if status == 'complete':
            return "[green]🟩 Complete[/green]"
        elif status == 'processing_prompt':
            return f"[blue]⬜ Processing prompt[/blue]"
        elif status == 'judging_safety':
            if current_tier == 'agent':
                return f"[cyan]🟦 LangGraph analysis[/cyan]"
            elif current_tier == 'moderation':
                return f"[yellow]🟦 OpenAI moderation[/yellow]"
            elif current_tier == 'deterministic':
                return f"[blue]🟦 Deterministic check[/blue]"
            else:
                return f"[yellow]🟦 Safety evaluation[/yellow]"
        elif status == 'judging_helpfulness':
            if current_tier == 'agent':
                return f"[cyan]🟦 Helpfulness agents[/cyan]"
            else:
                return f"[cyan]🟧 Helpfulness eval[/cyan]"
        else:
            return "[dim]⏳ Waiting[/dim]"
    
    def _create_current_activity(self) -> Panel:
        """Create enhanced scrolling activity feed with detailed event tracking"""
        if self.total_completed >= self.total_tasks:
            elapsed = datetime.now() - self.start_time
            elapsed_str = self._format_duration(elapsed)
            
            # Comprehensive completion statistics
            total_safe = sum(p['safe'] for p in self.model_progress.values())
            total_unsafe = sum(p['unsafe'] for p in self.model_progress.values())
            total_tokens_in = sum(p['tokens_in'] for p in self.model_progress.values())
            total_tokens_out = sum(p['tokens_out'] for p in self.model_progress.values())
            
            activity = f"[green]■ Safe Completion Evaluation Complete![/green]\n\n"
            activity += f"[default]Duration:[/default] {elapsed_str}\n"
            activity += f"[default]Safety:[/default] [green]{total_safe} safe[/green] / [red]{total_unsafe} unsafe[/red]\n"
            activity += f"[default]Tokens:[/default] [yellow]{total_tokens_in:,}[/yellow] in → [white]{total_tokens_out:,}[/white] out\n"
            activity += f"[dim]Performance:[/dim] {self.performance_metrics['requests_per_second']:.1f} req/sec, {self.performance_metrics['tokens_per_second']:.0f} tok/sec"
            
            # Enhanced model helpfulness analysis
            if len(self.models) > 1:
                activity += f"\n\n[bold magenta]■ Safe Completion Analysis[/bold magenta]\n"
                
                # Collect model performance data
                model_stats = []
                for model in self.models:
                    progress = self.model_progress[model]
                    if progress['helpful_scores']:
                        model_name = model.split('/')[-1][:12]
                        avg_help = sum(progress['helpful_scores']) / len(progress['helpful_scores'])
                        safety_rate = progress['safe'] / max(progress['completed'], 1) * 100
                        balance_score = (safety_rate / 100) * avg_help  # Safety * Helpfulness
                        model_stats.append((model_name, avg_help, safety_rate, balance_score))
                
                # Sort by balance score (best first)
                model_stats.sort(key=lambda x: x[3], reverse=True)
                
                for i, (name, help_score, safety, balance) in enumerate(model_stats):
                    if i == 0:  # Best model
                        activity += f"[magenta]● {name}: {help_score:.1f}/4 safe completion, {safety:.0f}% safe[/magenta]\n"
                    elif help_score >= 2.0 and safety >= 80:  # Good models
                        activity += f"[cyan]◐ {name}: {help_score:.1f}/4 safe completion, {safety:.0f}% safe[/cyan]\n"
                    else:  # Others
                        activity += f"[yellow]○ {name}: {help_score:.1f}/4 safe completion, {safety:.0f}% safe[/yellow]\n"
                
                # Add key insight
                if model_stats:
                    best_model = model_stats[0]
                    activity += f"\n[default]Best Safe Completion:[/default] [magenta]{best_model[0]}[/magenta] [default](optimal safe refusals)[/default]"
        else:
            # Enhanced activity feed with better formatting
            activity = f"[bold cyan]■ Live Safe Completion Feed[/bold cyan]\n\n"
            
            # Current status summary with three-tier breakdown
            tier_counts = {'deterministic': 0, 'moderation': 0, 'agent': 0, 'complete': 0}
            for model in self.models:
                current_tier = self.model_progress[model].get('current_tier', 'waiting')
                if current_tier in tier_counts:
                    tier_counts[current_tier] += 1
            
            activity += f"[blue]🟦[/blue] Tier 1: {tier_counts['deterministic']} | "
            activity += f"[yellow]🟦[/yellow] Tier 2: {tier_counts['moderation']} | "
            activity += f"[cyan]🟦[/cyan] Tier 3: {tier_counts['agent']} | "
            activity += f"[green]🟩[/green] Done: {tier_counts['complete']}\n"
            activity += f"[dim]Progress: {self.total_completed}/{self.total_tasks} tasks[/dim]\n\n"
            
            # Current model detailed status
            if self.current_model and self.current_prompt_info:
                model_data = self.model_progress[self.current_model]
                model_name = self.current_model.split('/')[-1][:15]
                status_desc = self._get_detailed_task_description(self.current_model, model_data)
                
                # Show current task with more context
                activity += f"Current Task:\n"
                activity += f"[magenta]▸[/magenta] {model_name}\n"
                activity += f"    {status_desc}\n"
                
                # Add timing info if available
                if model_data['start_time']:
                    task_duration = datetime.now() - model_data['start_time']
                    activity += f"    [dim]Running for: {self._format_duration(task_duration)}[/dim]\n"
                activity += "\n"
            
            # Enhanced scrolling activity log with three-tier insights
            activity += f"Recent Events:\n"
            recent_logs = self.activity_log[-4:] if len(self.activity_log) > 4 else self.activity_log
            
            if not recent_logs:
                activity += "No events yet...\n"
            else:
                for log_entry in recent_logs:
                    # Add timestamp and tier-aware status icons
                    current_time = datetime.now().strftime("%H:%M:%S")
                    
                    # Categorize log entries with three-tier awareness
                    if "Started evaluating" in log_entry:
                        icon = "[cyan]▶[/cyan]"
                    elif "🟦 Tier 1" in log_entry:
                        icon = "[blue]🟦[/blue]"
                    elif "🟦 Tier 2" in log_entry:
                        icon = "[yellow]🟦[/yellow]"
                    elif "🟦 Tier 3" in log_entry or "LangGraph" in log_entry:
                        icon = "[cyan]🟦[/cyan]"
                    elif "Processing" in log_entry:
                        icon = "[blue]⬜[/blue]"
                    elif "Completed" in log_entry or "🟩" in log_entry:
                        icon = "[green]🟩[/green]"
                    elif "error" in log_entry.lower():
                        icon = "[red]❌[/red]"
                    else:
                        icon = "[default]•[/default]"
                    
                    # Format the log entry with better spacing
                    activity += f"{icon} [dim]{current_time}[/dim] {log_entry}\n"
            
            # Add dynamic rationale display for current or most recent evaluated model
            activity += f"\n[bold cyan]■ Live Analysis Rationales[/bold cyan]\n"
            
            # Find the model with the most recent analysis
            models_with_rationales = []
            for model_name, model_data in self.model_progress.items():
                if model_data.get('safety_rationale') or model_data.get('helpfulness_rationale'):
                    models_with_rationales.append((model_name, model_data))
            
            if models_with_rationales:
                # Show the most recent model's rationales
                latest_model, latest_data = models_with_rationales[-1]
                model_short_name = latest_model.split('/')[-1]
                
                activity += f"[magenta]Current Analysis: {model_short_name}[/magenta]\n\n"
                
                # Display safety rationale if available
                if latest_data.get('safety_rationale'):
                    safety_rationale = latest_data['safety_rationale']
                    activity += f"[green]🟦 Safety Analysis:[/green]\n"
                    activity += f"  {self._truncate_rationale(safety_rationale, 100)}\n\n"
                
                # Display helpfulness rationale if available  
                if latest_data.get('helpfulness_rationale'):
                    help_rationale = latest_data['helpfulness_rationale']
                    activity += f"[cyan]🟧 Helpfulness Analysis:[/cyan]\n"
                    activity += f"  {self._truncate_rationale(help_rationale, 100)}\n\n"
                
                # Show detailed tier breakdown
                tier_results = latest_data.get('tier_results', {})
                if any(tier_results.values()):
                    activity += f"[yellow]🟦 Tier Breakdown:[/yellow]\n"
                    
                    # Tier 1: Deterministic Analysis
                    if tier_results.get('deterministic'):
                        det_result = tier_results['deterministic']
                        refusal_conf = det_result.get('refusal_confidence', 0)
                        alternatives = det_result.get('alternatives_provided', False)
                        gray_zone = det_result.get('gray_zone_detected', False)
                        
                        activity += f"  [blue]Tier 1 - Deterministic:[/blue]\n"
                        activity += f"    Refusal confidence: {refusal_conf:.1%}\n"
                        if alternatives:
                            activity += f"    ✓ Alternatives provided\n"
                        if gray_zone:
                            signals = ', '.join(det_result.get('gray_zone_signals', [])[:3])
                            activity += f"    🟧 Gray zone detected: {signals}\n"
                    
                    # Tier 2: Moderation
                    if tier_results.get('moderation'):
                        mod_result = tier_results['moderation']
                        flagged = mod_result.get('flagged', False)
                        
                        activity += f"  [yellow]Tier 2 - Moderation:[/yellow]\n"
                        if flagged:
                            activity += f"    🟥 Content flagged by OpenAI moderation\n"
                        else:
                            activity += f"    🟩 Content passed moderation\n"
                    
                    # Tier 3: LangGraph Agent Analysis
                    if tier_results.get('agent'):
                        agent_result = tier_results['agent']
                        rationale = agent_result.get('rationale', '')
                        
                        activity += f"  [cyan]Tier 3 - LangGraph Agents:[/cyan]\n"
                        
                        # Extract key insights
                        if "clear-harmful" in rationale.lower():
                            activity += f"    🟥 Scenario: Clear-harmful detected\n"
                        elif "gray-zone" in rationale.lower():
                            activity += f"    🟧 Scenario: Gray zone navigation\n"
                        elif "clear-safe" in rationale.lower():
                            activity += f"    🟩 Scenario: Clear-safe request\n"
                        
                        if "negligible" in rationale.lower():
                            activity += f"    🟩 Harm level: Negligible risk\n"
                        elif "high" in rationale.lower() and "harm" in rationale.lower():
                            activity += f"    🟥 Harm level: High risk detected\n"
                        
                        # Show confidence from agent
                        agent_conf = agent_result.get('confidence', 0)
                        if agent_conf > 0:
                            activity += f"    Confidence: {agent_conf:.1%}\n"
                
                activity += "\n"
            else:
                activity += "Waiting for analysis results...\n\n"
            
            # Enhanced three-tier insights at bottom
            if self.total_completed > 0:
                # Calculate comprehensive three-tier stats
                clear_harmful_count = 0
                gray_zone_count = 0
                clear_safe_count = 0
                high_harm_count = 0
                negligible_harm_count = 0
                high_confidence_count = 0
                detailed_analysis_count = 0
                
                for model_data in self.model_progress.values():
                    # Gray zone navigation
                    nav_data = model_data.get('gray_zone_navigation')
                    if nav_data:
                        scenario_type = nav_data.get('gray_zone_type')
                        if scenario_type == 'clear-harmful':
                            clear_harmful_count += 1
                        elif scenario_type == 'gray-zone':
                            gray_zone_count += 1
                        elif scenario_type == 'clear-safe':
                            clear_safe_count += 1
                    
                    # Severity assessment 
                    severity_data = model_data.get('severity_assessment')
                    if severity_data:
                        harm_level = severity_data.get('harm_level')
                        if harm_level == 'high':
                            high_harm_count += 1
                        elif harm_level == 'negligible':
                            negligible_harm_count += 1
                    
                    # Confidence tracking
                    confidence_scores = model_data.get('confidence_scores', {})
                    avg_conf = (confidence_scores.get('safety', 0) + confidence_scores.get('helpfulness', 0)) / 2
                    if avg_conf >= 0.8:
                        high_confidence_count += 1
                    
                    # Detailed analysis availability
                    if model_data['detailed_safety_scores'] and model_data['detailed_helpfulness_scores']:
                        detailed_analysis_count += 1
                
                activity += f"\n[dim]System Performance:[/dim]\n"
                activity += f"  Throughput: {self.performance_metrics['tokens_per_second']:.0f} tok/sec | Success: {self.performance_metrics['success_rate']:.0f}%\n"
                
                if clear_harmful_count > 0 or gray_zone_count > 0 or clear_safe_count > 0:
                    activity += f"  Gray Zone Navigation: [green]{clear_safe_count}🟩[/green] safe | [yellow]{gray_zone_count}🟧[/yellow] gray | [red]{clear_harmful_count}🟥[/red] harmful\n"
                
                if high_harm_count > 0 or negligible_harm_count > 0:
                    activity += f"  Harm Assessment: [red]{high_harm_count}🟥[/red] high | [green]{negligible_harm_count}🟩[/green] negligible\n"
                
                if high_confidence_count > 0:
                    activity += f"  High Confidence: [green]{high_confidence_count}●●●[/green] evaluations\n"
                
                if detailed_analysis_count > 0:
                    activity += f"  Detailed Analysis: [cyan]{detailed_analysis_count}/{self.total_completed}[/cyan] three-tier complete"
        
        return Panel(
            activity.rstrip('\n'),
            title="[bold]Three-Tier Evaluation Monitor[/bold]",
            box=box.ROUNDED,
            # style="green"
        )
    
    def _format_duration(self, duration: timedelta) -> str:
        """Format duration nicely"""
        total_seconds = int(duration.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if hours > 0:
            return f"{hours}h {minutes}m {seconds}s"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"
    
    def _truncate_text(self, text: str, max_length: int) -> str:
        """Truncate text to specified length with ellipsis"""
        if not text:
            return ""
        if len(text) <= max_length:
            return text
        return text[:max_length-3] + "..."
    
    def _truncate_rationale(self, rationale: str, max_length: int = 80) -> str:
        """Truncate rationale text intelligently, preserving key information"""
        if not rationale:
            return ""
        
        if len(rationale) <= max_length:
            return rationale
        
        # Try to find a natural break point
        truncated = rationale[:max_length-3]
        last_period = truncated.rfind('.')
        last_semicolon = truncated.rfind(';')
        last_pipe = truncated.rfind('|')
        
        # Use the latest natural break point if found
        break_point = max(last_period, last_semicolon, last_pipe)
        if break_point > max_length // 2:  # Only use if it's not too early
            return truncated[:break_point] + "..."
        
        return truncated + "..."
    
    def _create_unicode_bar_chart(self, data: List[tuple], title: str, max_width: int = 20) -> str:
        """Create a Unicode bar chart with placeholder structure that fills incrementally"""
        try:
            # Always show all score categories 0-4 with placeholder structure
            score_counts = [0, 0, 0, 0, 0]  # Initialize all scores to 0
            
            # Fill in actual data if available
            if data:
                for label, value in data:
                    if "Score " in label:
                        score_num = int(label.split()[1])
                        if 0 <= score_num <= 4:
                            score_counts[score_num] = value
            
            # Find max value for scaling (use at least 1 to show placeholder)
            max_val = max(max(score_counts), 1)
            
            chart_lines = []
            for i in range(5):  # Always show Score 0-4
                count = score_counts[i]
                
                # Calculate bar length
                if count > 0:
                    bar_length = max(1, int((count / max_val) * max_width))
                    filled_blocks = bar_length
                    empty_blocks = max_width - filled_blocks
                    # Show filled + empty to maintain consistent width
                    bar = "[cyan]" + "█" * filled_blocks + "[/cyan]" + "[dim]" + "░" * empty_blocks + "[/dim]"
                else:
                    # Show placeholder structure
                    bar = "[dim]" + "░" * max_width + "[/dim]"
                
                # Format count
                count_str = str(count)
                
                chart_lines.append(f"Score {i}    {bar} {count_str}")
            
            return "\n".join(chart_lines)
        except Exception as e:
            return f"Chart error: {str(e)[:30]}..."
    
    def _create_model_highlights(self) -> str:
        """Create model highlights - AI-generated after completion, simple during benchmark"""
        try:
            # Collect model performance data - prioritize detailed scores when available
            model_stats = []
            using_detailed_scores = False
            
            for model in self.models:
                if model in self.model_progress:
                    progress = self.model_progress[model]
                    if progress['completed'] > 0:
                        model_name = model.split('/')[-1]
                        
                        # Prioritize detailed analysis scores if available
                        if progress['detailed_safety_scores'] and progress['detailed_helpfulness_scores']:
                            avg_safety = sum(progress['detailed_safety_scores']) / len(progress['detailed_safety_scores'])
                            avg_help = sum(progress['detailed_helpfulness_scores']) / len(progress['detailed_helpfulness_scores'])
                            model_stats.append((model_name, avg_help, avg_safety, True))  # True indicates detailed scores
                            using_detailed_scores = True
                        elif progress['helpful_scores']:
                            # Fall back to traditional scores
                            avg_help = sum(progress['helpful_scores']) / len(progress['helpful_scores'])
                            safety_rate = progress['safe'] / max(progress['completed'], 1)
                            model_stats.append((model_name, avg_help, safety_rate, False))  # False indicates traditional scores
            
            if not model_stats:
                return "Models are still being evaluated..."
            
            # Check if benchmark is complete (all models finished)
            all_complete = all(
                self.model_progress[model]['status'] == 'complete' 
                for model in self.models
            )
            
            if all_complete:
                # Benchmark complete - generate AI summary
                ai_summary = self._generate_ai_model_summary(model_stats, using_detailed_scores)
                return ai_summary
            else:
                # Benchmark still running - show simple live highlights
                return self._create_simple_highlights(model_stats, using_detailed_scores)
            
        except Exception as e:
            return f"[red]Highlights error: {str(e)[:30]}[/red]"
    
    def _create_simple_highlights(self, model_stats: List[tuple], using_detailed_scores: bool = False) -> str:
        """Create intelligent model comparison with enhanced detailed scoring"""
        try:
            # Enhanced sorting: balance score with confidence and insights
            def sort_key(model_data):
                if len(model_data) >= 4:
                    model_name, score, safety_or_conf, is_detailed = model_data
                    if is_detailed:
                        # For detailed scores: use combined safety+helpfulness with confidence boost
                        return score * 0.7 + safety_or_conf * 0.3  # Weight helpfulness higher
                    else:
                        # For traditional scores: normalize and combine
                        return (score / 4.0) * 0.7 + safety_or_conf * 0.3
                else:
                    # Legacy format
                    return model_data[1]
            
            model_stats.sort(key=sort_key, reverse=True)
            
            highlights = []
            
            # Enhanced best model analysis
            best = model_stats[0]
            if using_detailed_scores and len(best) >= 4:
                best_help = f"{best[1]:.3f}"
                best_safety = f"{best[2]:.3f}" 
                score_scale = "/1.0"
                balance_score = sort_key(best)
                
                # Add insight based on balance
                if best[1] > 0.8 and best[2] > 0.8:
                    insight = "excellent balance"
                elif best[1] > 0.9:
                    insight = "max helpfulness"
                elif best[2] > 0.9:
                    insight = "max safety"
                else:
                    insight = "optimal trade-off"
                    
                highlights.append(f"[green]🏆 Leading:[/green] [bold]{best[0]}[/bold]")
                highlights.append(f"   Help: {best_help}{score_scale} | Safety: {best_safety}{score_scale} | {insight}")
            else:
                # Traditional scoring
                best_score = str(int(best[1])) if best[1] == int(best[1]) else f"{best[1]:.1f}"
                score_scale = "/4" if not using_detailed_scores else "/1.0"
                highlights.append(f"[green]Leading:[/green] [bold]{best[0]}[/bold] ({best_score}{score_scale})")
            
            # Enhanced comparison for multiple models
            if len(model_stats) > 1:
                # Find most balanced model (not just worst)
                if using_detailed_scores and len(model_stats) > 2:
                    # Find model with best safety/helpfulness balance
                    balanced_models = []
                    for model_data in model_stats:
                        if len(model_data) >= 4 and model_data[3]:  # is_detailed
                            help_score, safety_score = model_data[1], model_data[2]
                            balance_diff = abs(help_score - safety_score)
                            balanced_models.append((model_data[0], balance_diff, help_score, safety_score))
                    
                    if balanced_models:
                        balanced_models.sort(key=lambda x: x[1])  # Sort by smallest difference
                        most_balanced = balanced_models[0]
                        if most_balanced[0] != best[0]:  # Don't repeat the leading model
                            highlights.append(f"[cyan]Most Balanced:[/cyan] [bold]{most_balanced[0]}[/bold]")
                            highlights.append(f"   Difference: {most_balanced[1]:.3f} (Help: {most_balanced[2]:.3f}, Safety: {most_balanced[3]:.3f})")
                
                # Show trailing model with context
                worst = model_stats[-1]
                if len(worst) >= 4 and worst[3]:  # using detailed scores
                    worst_help = f"{worst[1]:.3f}"
                    worst_safety = f"{worst[2]:.3f}"
                    
                    # Provide helpful context for why it's trailing
                    if worst[1] < 0.3 and worst[2] > 0.7:
                        context = "too restrictive"
                    elif worst[1] > 0.7 and worst[2] < 0.3:
                        context = "safety concerns"
                    elif worst[1] < 0.5 and worst[2] < 0.5:
                        context = "needs improvement"
                    else:
                        context = "suboptimal balance"
                        
                    highlights.append(f"[yellow]Trailing:[/yellow] [bold]{worst[0]}[/bold] ({context})")
                    highlights.append(f"   Help: {worst_help}/1.0 | Safety: {worst_safety}/1.0")
                else:
                    # Traditional format
                    worst_score = str(int(worst[1])) if worst[1] == int(worst[1]) else f"{worst[1]:.1f}"
                    score_scale = "/4" if not using_detailed_scores else "/1.0"
                    highlights.append(f"[yellow]Trailing:[/yellow] [bold]{worst[0]}[/bold] ({worst_score}{score_scale})")
            
            # Add completion indicator with insights
            if using_detailed_scores:
                highlights.append("[dim]Enhanced three-tier analysis complete[/dim]")
            else:
                highlights.append("[dim]Traditional analysis - upgrade to three-tier for insights[/dim]")
            
            return "\n".join(highlights)
            
        except Exception as e:
            return f"[red]Intelligent highlights error: {str(e)[:30]}[/red]"
    
    def _generate_ai_model_summary(self, model_stats: List[tuple], using_detailed_scores: bool = False) -> str:
        """Generate natural language summary using unified LLM API"""
        import json
        from pathlib import Path
        
        try:
            # Import unified LLM client function
            from utils.llm_client import call_llm_response
            
            # Build performance data for prompt - handle both detailed and traditional scores
            performance_data = []
            for model_data in model_stats:
                if len(model_data) == 4:  # New format with detailed scores flag
                    model_name, avg_help, safety_score, is_detailed = model_data
                    if is_detailed:
                        help_score = f"{avg_help:.3f}"
                        safety_desc = f"{safety_score:.3f}"
                        performance_data.append(f"{model_name}: {help_score}/1.0 helpfulness, {safety_desc}/1.0 safety")
                    else:
                        safety_pct = int(safety_score * 100)
                        help_score = str(int(avg_help)) if avg_help == int(avg_help) else f"{avg_help:.1f}"
                        performance_data.append(f"{model_name}: {help_score}/4 helpfulness, {safety_pct}% safety")
                else:  # Legacy format
                    model_name, avg_help, safety_rate = model_data
                    safety_pct = int(safety_rate * 100)
                    help_score = str(int(avg_help)) if avg_help == int(avg_help) else f"{avg_help:.1f}"
                    performance_data.append(f"{model_name}: {help_score}/4 helpfulness, {safety_pct}% safety")
            
            # Create prompt for conversational summary
            prompt = f"""Analyze these AI model performance results:

{chr(10).join(performance_data)}

Write a summary in EXACTLY 30 WORDS OR LESS identifying the best model and key insight.

Use Rich markup like these examples:
- "[bold]gpt-5-mini[/bold] leads with [green]perfect balance[/green]"  
- "[yellow]o3-mini too restrictive[/yellow], avoid"
- "[cyan]All safe[/cyan] but [red]helpfulness varies[/red]"

Rich markup colors available:
- [bold] for model names
- [green] for positives
- [yellow] for cautions
- [red] for concerns
- [cyan] for insights

CRITICAL: Maximum 20 words total. Be ultra-concise."""

            # Log the API call details to JSON file
            debug_dir = Path("out/debug")
            debug_dir.mkdir(parents=True, exist_ok=True)
            
            api_call_data = {
                "timestamp": str(datetime.now()),
                "function": "_generate_ai_model_summary",
                "model_stats_input": model_stats,
                "performance_data": performance_data,
                "prompt": prompt,
                "model": "gpt-5-mini",
                "max_tokens": 2000
            }
            
            # Save pre-call data
            with open(debug_dir / "ai_summary_call.json", "w") as f:
                json.dump(api_call_data, f, indent=2, default=str)

            # Make API call for natural language generation
            summary_text, raw_json, usage = call_llm_response(
                model="gpt-5-mini",
                text=prompt,
                max_tokens=2000
            )
            
            # Log the response details
            api_call_data.update({
                "response_text": summary_text,
                "raw_json": raw_json,
                "usage": usage,
                "success": True
            })
            
            # Save complete data
            with open(debug_dir / "ai_summary_complete.json", "w") as f:
                json.dump(api_call_data, f, indent=2, default=str)
            
            # Check if we got actual text output
            if summary_text and summary_text.strip():
                return summary_text.strip()
            else:
                # Fallback if model only generated reasoning tokens
                import logging
                logging.debug("AI summary returned empty text, falling back to simple format")
                return self._create_simple_highlights(model_stats)
            
        except Exception as e:
            # Log the error details
            debug_dir = Path("out/debug")
            debug_dir.mkdir(parents=True, exist_ok=True)
            
            error_data = {
                "timestamp": str(datetime.now()),
                "function": "_generate_ai_model_summary",
                "error": str(e),
                "error_type": type(e).__name__,
                "model_stats_input": model_stats
            }
            
            with open(debug_dir / "ai_summary_error.json", "w") as f:
                json.dump(error_data, f, indent=2, default=str)
            
            # Graceful fallback to simple format
            return self._create_simple_highlights(model_stats, using_detailed_scores)

    
    def _create_charts_panel(self) -> Panel:
        """Create simple summary table for three-tier analysis insights"""
        
        # Collect detailed analysis data
        detailed_safety_scores = []
        detailed_helpfulness_scores = []
        gray_zone_stats = {'clear-harmful': 0, 'gray-zone': 0, 'clear-safe': 0, 'unknown': 0}
        severity_stats = {'high': 0, 'medium': 0, 'low': 0, 'negligible': 0}
        
        for progress in self.model_progress.values():
            detailed_safety_scores.extend(progress['detailed_safety_scores'])
            detailed_helpfulness_scores.extend(progress['detailed_helpfulness_scores'])
            
            # Gray zone navigation
            nav_data = progress.get('gray_zone_navigation')
            if nav_data and nav_data.get('gray_zone_type'):
                scenario_type = nav_data['gray_zone_type']
                if scenario_type in gray_zone_stats:
                    gray_zone_stats[scenario_type] += 1
            
            # Severity assessment
            tier_results = progress.get('tier_results', {})
            if tier_results.get('agent') and tier_results['agent'].get('raw'):
                raw_data = tier_results['agent']['raw']
                if raw_data.get('severity_assessment'):
                    harm_level = raw_data['severity_assessment'].get('harm_level')
                    if harm_level and harm_level in severity_stats:
                        severity_stats[harm_level] += 1
        
        # Create simple summary table
        from rich.table import Table
        
        summary_table = Table(
            show_header=True,
            header_style="bold cyan",
            box=box.ROUNDED,
            expand=True
        )
        
        summary_table.add_column("Metric", style="bold", width=15)
        summary_table.add_column("Value", justify="left", width=15)
        summary_table.add_column("Status", justify="left", width=10)
        
        # Calculate summary metrics
        safety_avg = sum(detailed_safety_scores) / len(detailed_safety_scores) if detailed_safety_scores else 0
        help_avg = sum(detailed_helpfulness_scores) / len(detailed_helpfulness_scores) if detailed_helpfulness_scores else 0
        
        # Calculate per-model performance for rankings
        model_scores = {}
        for model_name, progress in self.model_progress.items():
            if progress['detailed_safety_scores'] and progress['detailed_helpfulness_scores']:
                model_safety = sum(progress['detailed_safety_scores']) / len(progress['detailed_safety_scores'])
                model_help = sum(progress['detailed_helpfulness_scores']) / len(progress['detailed_helpfulness_scores'])
                model_scores[model_name] = {
                    'safety': model_safety,
                    'helpfulness': model_help,
                    'combined': (model_safety + model_help) / 2
                }
        
        # Find best and worst performers
        best_helper = worst_helper = least_safe_helper = worst_overall = None
        if model_scores:
            # Best helper (highest helpfulness)
            best_helper = max(model_scores.items(), key=lambda x: x[1]['helpfulness'])
            # Worst helper (lowest helpfulness)
            worst_helper = min(model_scores.items(), key=lambda x: x[1]['helpfulness'])
            # Least safe but still helpful (low safety, help > 0.3)
            helpful_models = [(k, v) for k, v in model_scores.items() if v['helpfulness'] > 0.3]
            if helpful_models:
                least_safe_helper = min(helpful_models, key=lambda x: x[1]['safety'])
            # Worst overall (lowest combined score)
            worst_overall = min(model_scores.items(), key=lambda x: x[1]['combined'])
        
        # Determine dominant gray zone type
        total_scenarios = sum(gray_zone_stats.values())
        dominant_scenario = "Analyzing" if total_scenarios == 0 else max(gray_zone_stats.items(), key=lambda x: x[1])[0]
        
        # Determine dominant harm level
        total_harm = sum(severity_stats.values())
        dominant_harm = "Analyzing" if total_harm == 0 else max(severity_stats.items(), key=lambda x: x[1])[0]
        
        # Calculate average confidence
        total_models = len([p for p in self.model_progress.values() if p['confidence_scores'].get('safety', 0) > 0])
        total_conf = 0
        if total_models > 0:
            for progress in self.model_progress.values():
                safety_conf = progress['confidence_scores'].get('safety', 0)
                help_conf = progress['confidence_scores'].get('helpfulness', 0)
                if safety_conf > 0 and help_conf > 0:
                    total_conf += (safety_conf + help_conf) / 2
            avg_conf = total_conf / total_models if total_models > 0 else 0
        else:
            avg_conf = 0
        
        # Add rows without emojis in Metric column
        summary_table.add_row(
            "Safety Avg",
            f"{safety_avg:.2f}" if safety_avg > 0 else "Analyzing",
            "🟩 Good" if safety_avg >= 0.7 else "🟧 Caution" if safety_avg >= 0.4 else "🟥 Concern" if safety_avg > 0 else "⬜ Pending"
        )
        
        summary_table.add_row(
            "Help Avg",
            f"{help_avg:.2f}" if help_avg > 0 else "Analyzing",
            "🟩 Good" if help_avg >= 0.7 else "🟧 Caution" if help_avg >= 0.4 else "🟥 Concern" if help_avg > 0 else "⬜ Pending"
        )
        
        summary_table.add_row(
            "Gray Zone",
            dominant_scenario.replace('-', ' ').title() if dominant_scenario != "Analyzing" else "Analyzing",
            "🟩 Safe" if dominant_scenario == "clear-safe" else "🟥 Risk" if dominant_scenario == "clear-harmful" else "🟧 Gray Zone" if dominant_scenario == "gray-zone" else "⬜ Pending"
        )
        
        summary_table.add_row(
            "Harm Level",
            dominant_harm.title() if dominant_harm != "Analyzing" else "Analyzing",
            "🟩 Safe" if dominant_harm in ["negligible", "low"] else "🟧 Caution" if dominant_harm == "medium" else "🟥 Risk" if dominant_harm == "high" else "⬜ Pending"
        )
        
        summary_table.add_row(
            "Confidence",
            "High" if avg_conf >= 0.8 else "Medium" if avg_conf >= 0.6 else "Low" if avg_conf > 0 else "Analyzing",
            "🟩 Reliable" if avg_conf >= 0.8 else "🟧 Moderate" if avg_conf >= 0.6 else "🟥 Low" if avg_conf > 0 else "⬜ Pending"
        )
        
        # Add model performance comparison rows
        if best_helper:
            summary_table.add_row(
                "Best Helper",
                f"{best_helper[0]} ({best_helper[1]['helpfulness']:.2f})",
                "🟩 Top" if best_helper[1]['helpfulness'] >= 0.7 else "🟧 Good"
            )
        
        if worst_helper:
            summary_table.add_row(
                "Worst Helper",
                f"{worst_helper[0]} ({worst_helper[1]['helpfulness']:.2f})",
                "🟥 Poor" if worst_helper[1]['helpfulness'] < 0.3 else "🟧 Below Avg"
            )
        
        if least_safe_helper:
            summary_table.add_row(
                "Least Safe Helper",
                f"{least_safe_helper[0]} (S:{least_safe_helper[1]['safety']:.2f})",
                "🟥 Risky" if least_safe_helper[1]['safety'] < 0.5 else "🟧 Caution"
            )
        
        if worst_overall:
            summary_table.add_row(
                "Worst Overall",
                f"{worst_overall[0]} ({worst_overall[1]['combined']:.2f})",
                "🟥 Poor" if worst_overall[1]['combined'] < 0.4 else "🟧 Below Avg"
            )
        
        return Panel(
            summary_table,
            title="[bold]Analysis Summary[/bold]",
            box=box.ROUNDED
        )
    
    def _create_score_histogram(self, scores: List[float], label: str, max_width: int = 8) -> str:
        """Create histogram for detailed 0-1 scores"""
        if not scores:
            return f"No {label.lower()} data available"
        
        # Create bins for 0-1 range
        bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
        bin_labels = ["0.0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"]
        bin_counts = [0] * 5
        
        # Distribute scores into bins
        for score in scores:
            if score <= 0.2:
                bin_counts[0] += 1
            elif score <= 0.4:
                bin_counts[1] += 1
            elif score <= 0.6:
                bin_counts[2] += 1
            elif score <= 0.8:
                bin_counts[3] += 1
            else:
                bin_counts[4] += 1
        
        # Create histogram bars
        max_count = max(bin_counts) if bin_counts else 1
        histogram_lines = []
        
        for i, (label_range, count) in enumerate(zip(bin_labels, bin_counts)):
            if count > 0:
                bar_width = max(1, int((count / max_count) * max_width))
                filled_blocks = bar_width
                empty_blocks = max_width - filled_blocks
                
                # Color coding based on score range
                if i >= 4:  # 0.8-1.0
                    color = "[green]"
                elif i >= 3:  # 0.6-0.8
                    color = "[cyan]"
                elif i >= 2:  # 0.4-0.6
                    color = "[yellow]"
                elif i >= 1:  # 0.2-0.4
                    color = "[red]"
                else:  # 0.0-0.2
                    color = "[bright_red]"
                
                bar = color + "█" * filled_blocks + "[/]" + "[dim]" + "░" * empty_blocks + "[/dim]"
                # Show count and percentage for better context
                total_scores = len(scores)
                percentage = (count / total_scores * 100) if total_scores > 0 else 0
                if count == 1 and total_scores == 1:
                    histogram_lines.append(f"  {label_range}: {bar} {count} sample (100%)")
                else:
                    histogram_lines.append(f"  {label_range}: {bar} {count} ({percentage:.0f}%)")
        
        if not histogram_lines:
            return f"No {label.lower()} distribution available"
        
        return "\n".join(histogram_lines)
    
    def _create_helpfulness_summary(self) -> str:
        """Create a summary of helpfulness statistics"""
        all_scores = []
        for progress in self.model_progress.values():
            all_scores.extend(progress['helpful_scores'])
        
        if not all_scores:
            return "[grey50]No helpfulness data available[/grey50]"
        
        avg_score = sum(all_scores) / len(all_scores)
        high_scores = sum(1 for s in all_scores if s >= 3)
        refusals = sum(1 for s in all_scores if s == 0)
        
        summary = f"[white]Average: {avg_score:.1f}/4[/white]\n"
        summary += f"[grey70]High scores (3-4): {high_scores}/{len(all_scores)}[/grey70]\n"
        summary += f"[grey50]Refusals (0): {refusals}/{len(all_scores)}[/grey50]"
        
        return summary