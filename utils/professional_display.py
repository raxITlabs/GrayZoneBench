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
                 dataset: str = None, config: str = None, split: str = None, total_dataset_size: int = None):
        self.models = models
        self.total_prompts = total_prompts
        self.judge_model = judge_model
        self.judge_task = judge_task
        self.dataset = dataset
        self.config = config
        self.split = split or "train"
        self.total_dataset_size = total_dataset_size
        self.start_time = datetime.now()
        
        # Additional tracking for enhanced statistics
        self.total_tokens_processed = 0
        self.total_requests_made = 0
        self.avg_response_time = 0.0
        self.throughput_history = []  # (timestamp, tokens_per_second)
        self.error_count = 0
        self.blocked_count = 0
        
        # Track comprehensive progress per model
        self.model_progress = {
            model: {
                'completed': 0,
                'safe': 0,
                'unsafe': 0,
                'helpful_scores': [],
                'status': 'pending',  # pending, processing_prompt, judging_safety, judging_helpfulness, complete
                'errors': 0,
                'blocked': 0,
                'start_time': None,
                'end_time': None,
                'tokens_in': 0,
                'tokens_out': 0,
                'current_prompt': None,
                'current_category': None,
                'current_step': 'waiting'
            } for model in models
        }
        
        self.current_model = None
        self.current_prompt_info = None
        self.total_completed = 0
        self.total_tasks = len(models) * total_prompts
        
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
    
    def update_progress(self, model: str, prompt_info: str, step: str = 'processing', result: Optional[Dict[str, Any]] = None):
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
        
        # Update current step and status
        progress_data['current_step'] = step
        progress_data['current_prompt'] = prompt_info
        
        if step == 'processing_prompt':
            progress_data['status'] = 'processing_prompt'
            self.activity_log.append(f"{model}: Processing {prompt_info}")
        elif step == 'judging_safety':
            progress_data['status'] = 'judging_safety'
            self.activity_log.append(f"{model}: Judging safety of response")
        elif step == 'judging_helpfulness':
            progress_data['status'] = 'judging_helpfulness'
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
            
            # Update global token tracking
            self.total_tokens_processed += result.get('input_tokens', 0) + result.get('output_tokens', 0)
            self.total_requests_made += 1
            
            # Safety tracking
            safety_label = result.get('safety')
            if safety_label == 'SAFE':
                progress_data['safe'] += 1
            elif safety_label == 'UNSAFE':
                progress_data['unsafe'] += 1
            
            # Helpfulness tracking
            help_score = result.get('helpfulness')
            if isinstance(help_score, (int, float)) and help_score is not None:
                progress_data['helpful_scores'].append(help_score)
            
            # Token usage tracking
            progress_data['tokens_in'] += result.get('input_tokens', 0) or 0
            progress_data['tokens_out'] += result.get('output_tokens', 0) or 0
            
            # Mark complete if all prompts done
            if progress_data['completed'] >= self.total_prompts:
                progress_data['status'] = 'complete'
                progress_data['end_time'] = datetime.now()
                duration = progress_data['end_time'] - progress_data['start_time']
                self.activity_log.append(f"{model}: Completed all evaluations in {self._format_duration(duration)}")
    
    def generate_display(self) -> Layout:
        """Generate the comprehensive professional dashboard with enhanced layout"""
        from rich.console import Console
        console = Console()
        terminal_width = console.size.width
        
        # Create main layout
        layout = Layout()
        
        # Create all sections
        context_header = self._create_context_header()
        dataset_info = self._create_dataset_info_panel()
        config_panel = self._create_configuration_panel()
        evaluation_table = self._create_evaluation_table()
        statistics_panel = self._create_statistics_panel()
        charts_panel = self._create_charts_panel()
        current_activity = self._create_current_activity()
        
        # Use fixed height for charts panel
        charts_height = 15
        
        # Use responsive layout based on terminal width
        if terminal_width >= 120:
            # Wide layout: 3 columns with charts
            layout.split_column(
                Layout(context_header, size=8),  # Increased from 4 to 8
                Layout(name="main_content", size=len(self.models) + 8),
                Layout(name="bottom_panels", size=6)
            )
            
            # Split main content into 3 columns
            layout["main_content"].split_row(
                Layout(name="left_column", ratio=1),
                Layout(evaluation_table, name="center_column", ratio=2),
                Layout(name="right_column", ratio=1)
            )
            
            # Fill left and right columns
            layout["left_column"].split_column(
                Layout(dataset_info, size=8),
                Layout(config_panel)
            )
            
            layout["right_column"].split_column(
                Layout(statistics_panel, size=8),
                Layout(charts_panel, size=charts_height)
            )
            
            layout["bottom_panels"].update(current_activity)
            
        elif terminal_width >= 80:
            # Medium layout: 2 columns with stacked info
            layout.split_column(
                Layout(context_header, size=8),  # Increased from 4 to 8
                Layout(name="info_row", size=8),
                Layout(evaluation_table, size=len(self.models) + 6),
                Layout(name="charts_row", size=charts_height),
                Layout(current_activity, size=6)
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
                Layout(context_header, size=8),  # Added header to narrow layout
                Layout(dataset_info, size=6),
                Layout(evaluation_table, size=len(self.models) + 6),
                Layout(statistics_panel, size=8),
                Layout(charts_panel, size=charts_height),
                Layout(current_activity, size=5)
            )
        
        return layout
    
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
        return 15  # Fixed height
    
    def _create_dataset_info_panel(self) -> Panel:
        """Create comprehensive dataset information panel"""
        dataset_name = self.dataset or "HarmBench"
        config_name = self.config or "standard"
        
        dataset_info = f"{dataset_name}\n"
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
        
        # Add average scores if available
        if self.performance_metrics['avg_safety_score'] > 0:
            stats += f"\nAverage Scores:\n"
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
        config_text = f"Evaluation Configuration\n\n"
        config_text += f"Models: {len(self.models)} models\n"
        for i, model in enumerate(self.models):
            status_indicator = "[default]○[/default]"
            if model in self.model_progress:
                if self.model_progress[model]['status'] == 'complete':
                    status_indicator = "[green]●[/green]"
                elif self.model_progress[model]['status'] != 'pending':
                    status_indicator = "[blue]◐[/blue]"
            config_text += f"  {status_indicator} {model}\n"
        
        config_text += f"\nJudge: {self.judge_model}\n"
        
        task_desc = {
            'safety': 'Safety evaluation only',
            'helpfulness': 'Helpfulness evaluation only', 
            'both': 'Safety + Helpfulness evaluation'
        }.get(self.judge_task, self.judge_task)
        config_text += f"Task: {task_desc}\n"
        
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
        """Update performance metrics based on current progress"""
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
            
            # Calculate average scores
            safety_scores = []
            helpfulness_scores = []
            
            for progress in self.model_progress.values():
                if progress['safe'] > 0:
                    safety_scores.extend([1] * progress['safe'])
                if progress['unsafe'] > 0:
                    safety_scores.extend([0] * progress['unsafe'])
                helpfulness_scores.extend(progress['helpful_scores'])
            
            if safety_scores:
                self.performance_metrics['avg_safety_score'] = sum(safety_scores) / len(safety_scores)
            if helpfulness_scores:
                self.performance_metrics['avg_helpfulness_score'] = sum(helpfulness_scores) / len(helpfulness_scores)
    
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
        
        # Key metrics with compatible colors
        metrics_line = f"[green]Safety: {safety_rate:.0f}%[/green] | [cyan]Avg Safe Completion: {avg_helpfulness:.1f}/4[/cyan] | [white]Progress: {progress_pct:.0f}%[/white]"
        
        # Model status summary
        completed_models = sum(1 for p in self.model_progress.values() if p['status'] == 'complete')
        models_info = f"[dim]Models:[/dim] {completed_models}/{len(self.models)} complete | [dim]Runtime:[/dim] {elapsed_str}"
        
        # Core objective
        objective = "[bold]Core Question:[/bold] Which models provide safe completions instead of blind refusals?"
        
        # Best model indicator (if data available)
        best_model_info = ""
        if all_helpfulness and (total_safe + total_unsafe) > 0:
            # Find model with best safety+helpfulness balance
            best_model = None
            best_score = -1
            for model in self.models:
                if model in self.model_progress:
                    progress = self.model_progress[model]
                    if progress['completed'] > 0 and progress['helpful_scores']:
                        model_safety = progress['safe'] / max(progress['completed'], 1)
                        model_help = sum(progress['helpful_scores']) / len(progress['helpful_scores'])
                        # Balance score: safety * helpfulness
                        balance_score = model_safety * model_help
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
        
        # Add responsive columns without fixed widths
        table.add_column("Model", style="bold")
        table.add_column("Status", justify="center")
        table.add_column("Progress", justify="center")
        table.add_column("Safety", justify="center")
        table.add_column("SC", justify="center")  # Safe Completion
        table.add_column("In/Out", justify="center")  # Tokens abbreviated
        table.add_column("Time", justify="center")
        table.add_column("Current Task")
        
        # Ensure all models are shown, even if not started yet
        for model in self.models:
            progress_data = self.model_progress[model]
            
            # Status indicator using compatible colors
            status = progress_data['status']
            if status == 'complete':
                status_display = "[green]●[/green]"
            elif status in ['processing_prompt', 'judging_safety', 'judging_helpfulness']:
                status_display = "[blue]◐[/blue]"
            else:
                status_display = "[default]○[/default]"
            
            # Progress bar
            completed = progress_data['completed']
            progress_bar = self._create_progress_bar(completed, self.total_prompts)
            
            # Safety display using compatible colors
            safe_count = progress_data['safe']
            unsafe_count = progress_data['unsafe']
            if completed > 0:
                if unsafe_count > 0:
                    safety_display = f"[green]{safe_count}[/green]/[red]{unsafe_count}[/red]"
                else:
                    safety_display = f"[green]{safe_count}[/green]"
            else:
                safety_display = "[default]-[/default]"
            
            # Safe completion average using compatible colors
            if progress_data['helpful_scores']:
                avg_help = sum(progress_data['helpful_scores']) / len(progress_data['helpful_scores'])
                if avg_help == int(avg_help):
                    help_display = f"[cyan]{int(avg_help)}/4[/cyan]"
                else:
                    help_display = f"[cyan]{avg_help:.1f}/4[/cyan]"
            else:
                help_display = "[default]-[/default]"
            
            # Token usage with compatible colors - abbreviated format
            tokens_in = progress_data['tokens_in']
            tokens_out = progress_data['tokens_out']
            if tokens_in > 0 or tokens_out > 0:
                # Abbreviate large numbers (25k instead of 25,094)
                in_abbrev = f"{tokens_in//1000}k" if tokens_in >= 1000 else str(tokens_in)
                out_abbrev = f"{tokens_out//1000}k" if tokens_out >= 1000 else str(tokens_out)
                tokens_display = f"[yellow]{in_abbrev}[/yellow]/[white]{out_abbrev}[/white]"
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
            
            # Current task description
            current_task = self._get_detailed_task_description(model, progress_data)
            
            # Add issues if any
            issues = []
            if progress_data['errors'] > 0:
                issues.append(f"[red]{progress_data['errors']} err[/red]")
            if progress_data['blocked'] > 0:
                issues.append(f"[yellow]{progress_data['blocked']} blocked[/yellow]")
            
            if issues:
                current_task += f" | {' '.join(issues)}"
            
            table.add_row(
                model,
                status_display,
                progress_bar,
                safety_display,
                help_display,
                tokens_display,
                time_display,
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
        """Get detailed description of current task"""
        status = progress_data['status']
        current_prompt = progress_data.get('current_prompt', '')
        
        if status == 'complete':
            return "[green]✓ Complete[/green]"
        elif status == 'processing_prompt':
            return f"[blue]● Processing[/blue]"
        elif status == 'judging_safety':
            return f"[yellow]● Safety eval[/yellow]"
        elif status == 'judging_helpfulness':
            return f"[cyan]● Safe completion eval[/cyan]"
        else:
            return "[default]○ Waiting[/default]"
    
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
            
            # Current status summary
            active_models = [m for m in self.models if self.model_progress[m]['status'] not in ['pending', 'complete']]
            if active_models:
                activity += f"[blue]◐[/blue] Active: {len(active_models)} models processing\n"
            
            completed_models = [m for m in self.models if self.model_progress[m]['status'] == 'complete']
            if completed_models:
                activity += f"[green]●[/green] Complete: {len(completed_models)} models finished\n"
                
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
            
            # Enhanced scrolling activity log with timestamps and icons
            activity += f"Recent Events:\n"
            recent_logs = self.activity_log[-4:] if len(self.activity_log) > 4 else self.activity_log
            
            if not recent_logs:
                activity += "No events yet...\n"
            else:
                for log_entry in recent_logs:
                    # Add timestamp and status icons
                    current_time = datetime.now().strftime("%H:%M:%S")
                    
                    # Categorize log entries with compatible icons
                    if "Started evaluating" in log_entry:
                        icon = "[cyan]▶[/cyan]"
                    elif "Processing" in log_entry:
                        icon = "[blue]●[/blue]"
                    elif "Judging" in log_entry:
                        icon = "[yellow]◆[/yellow]"
                    elif "Completed" in log_entry:
                        icon = "[green]✓[/green]"
                    elif "error" in log_entry.lower():
                        icon = "[red]✗[/red]"
                    else:
                        icon = "[default]•[/default]"
                    
                    # Format the log entry with better spacing
                    activity += f"{icon} [dim]{current_time}[/dim] {log_entry}\n"
            
            # Add performance indicators at bottom
            if self.total_completed > 0:
                activity += f"\n[dim]Performance: {self.performance_metrics['tokens_per_second']:.0f} tok/sec | {self.performance_metrics['success_rate']:.0f}% success[/dim]"
        
        return Panel(
            activity.rstrip('\n'),
            title="[bold]Safe Completion Monitor[/bold]",
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
            # Collect model performance data
            model_stats = []
            for model in self.models:
                if model in self.model_progress:
                    progress = self.model_progress[model]
                    if progress['completed'] > 0 and progress['helpful_scores']:
                        model_name = model.split('/')[-1]
                        avg_help = sum(progress['helpful_scores']) / len(progress['helpful_scores'])
                        safety_rate = progress['safe'] / max(progress['completed'], 1)
                        model_stats.append((model_name, avg_help, safety_rate))
            
            if not model_stats:
                return "Models are still being evaluated..."
            
            # Check if benchmark is complete (all models finished)
            all_complete = all(
                self.model_progress[model]['status'] == 'complete' 
                for model in self.models
            )
            
            if all_complete:
                # Benchmark complete - generate AI summary
                ai_summary = self._generate_ai_model_summary(model_stats)
                return ai_summary
            else:
                # Benchmark still running - show simple live highlights
                return self._create_simple_highlights(model_stats)
            
        except Exception as e:
            return f"[red]Highlights error: {str(e)[:30]}[/red]"
    
    def _create_simple_highlights(self, model_stats: List[tuple]) -> str:
        """Create simple highlights for live benchmark (no AI generation)"""
        try:
            # Sort by helpfulness score
            model_stats.sort(key=lambda x: x[1], reverse=True)
            
            highlights = []
            
            # Best model (highest score)
            best = model_stats[0]
            best_score = str(int(best[1])) if best[1] == int(best[1]) else f"{best[1]:.1f}"
            highlights.append(f"[green]Leading:[/green] [bold]{best[0]}[/bold] ({best_score}/4)")
            
            # Worst model (lowest score) - only if we have multiple models
            if len(model_stats) > 1:
                worst = model_stats[-1]
                worst_score = str(int(worst[1])) if worst[1] == int(worst[1]) else f"{worst[1]:.1f}"
                highlights.append(f"[yellow]Trailing:[/yellow] [bold]{worst[0]}[/bold] ({worst_score}/4)")
            
            # Add completion indicator  
            highlights.append("[dim]AI analysis after completion[/dim]")
            
            return "\n".join(highlights)
            
        except Exception as e:
            return f"[red]Simple highlights error: {str(e)[:20]}[/red]"
    
    def _generate_ai_model_summary(self, model_stats: List[tuple]) -> str:
        """Generate natural language summary using OpenAI API"""
        import json
        from pathlib import Path
        
        try:
            # Import OpenAI client function
            from utils.openai_client import call_openai_response
            from openai import OpenAI
            
            # Create a simple client (use same as benchmark)
            client = OpenAI()
            
            # Build performance data for prompt
            performance_data = []
            for model_name, avg_help, safety_rate in model_stats:
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
                "max_tokens": 1000
            }
            
            # Save pre-call data
            with open(debug_dir / "ai_summary_call.json", "w") as f:
                json.dump(api_call_data, f, indent=2, default=str)

            # Make API call for natural language generation
            summary_text, raw_json, usage = call_openai_response(
                client=client,
                model="gpt-5-mini",
                text=prompt,
                max_tokens=1000
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
            model_stats.sort(key=lambda x: x[1], reverse=True)
            best = model_stats[0]
            best_score = str(int(best[1])) if best[1] == int(best[1]) else f"{best[1]:.1f}"
            
            if len(model_stats) > 1:
                worst = model_stats[-1]
                worst_score = str(int(worst[1])) if worst[1] == int(worst[1]) else f"{worst[1]:.1f}"
                return f"[green]Top performer:[/green] [bold]{best[0]}[/bold] ({best_score}/4) | [red]Needs improvement:[/red] [bold]{worst[0]}[/bold] ({worst_score}/4)"
            else:
                return f"[green]Performance:[/green] [bold]{best[0]}[/bold] achieving {best_score}/4 helpfulness"

    
    def _create_charts_panel(self) -> Panel:
        """Create a panel with Rich-native Unicode charts"""
        
        # Generate helpfulness distribution data
        all_scores = []
        for progress in self.model_progress.values():
            all_scores.extend(progress['helpful_scores'])
        
        if all_scores:
            # Count distribution of scores 0-4
            score_counts = [0, 0, 0, 0, 0]
            for score in all_scores:
                if 0 <= int(score) <= 4:
                    score_counts[int(score)] += 1
            
            helpfulness_data = [(f"Score {i}", count) for i, count in enumerate(score_counts) if count > 0]
        else:
            helpfulness_data = []
        
        # Add clear score explanation first
        charts_content = "[cyan bold]Safe Completion Distribution[/cyan bold]\n"
        charts_content += "[dim]Helpfulness Scale: 0=Refusal → 1=Minimal → 2=Some → 3=Good → 4=Excellent[/dim]\n\n"
        
        if helpfulness_data:
            # Restore original bar chart
            helpfulness_chart = self._create_unicode_bar_chart(helpfulness_data, "Safe Completion", max_width=15)
            charts_content += f"{helpfulness_chart}\n\n"
            
            # Add best and worst model highlights
            model_highlights = self._create_model_highlights()
            charts_content += f"{model_highlights}\n\n"
        else:
            charts_content += "No safe completion data yet\n\n"
        
        
        # Create layout with just the charts content (no ranking table)
        from rich.console import Group
        charts_group = Text.from_markup(charts_content)
        
        return Panel(
            charts_group,
            title="[bold]Safe Completion Analysis[/bold]",
            box=box.ROUNDED,
            # style="yellow"
        )
    
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