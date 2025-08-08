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
                Layout(charts_panel, size=15)
            )
            
            layout["bottom_panels"].update(current_activity)
            
        elif terminal_width >= 80:
            # Medium layout: 2 columns with stacked info
            layout.split_column(
                Layout(context_header, size=8),  # Increased from 4 to 8
                Layout(name="info_row", size=8),
                Layout(evaluation_table, size=len(self.models) + 6),
                Layout(name="charts_row", size=12),
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
                Layout(charts_panel, size=10),
                Layout(current_activity, size=5)
            )
        
        return layout
    
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
            title="Dataset Information",
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
            title="Real-time Statistics",
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
            title="Configuration",
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
            title="Safe Completion Benchmark Overview",
            box=box.ROUNDED,
            style="white",
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
            
            activity = f"[bold green]■ Safe Completion Evaluation Complete![/bold green]\n\n"
            activity += f"[default]Duration:[/default] [white]{elapsed_str}[/white]\n"
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
            title="Safe Completion Monitor",
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
        """Create a Unicode bar chart using Rich monotone colors"""
        if not data:
            return "No data available"
        
        try:
            # Find max value for scaling
            max_val = max(item[1] for item in data if len(item) > 1)
            if max_val == 0:
                return "No data to display"
            
            chart_lines = []
            for label, value in data:
                # Calculate bar length
                bar_length = int((value / max_val) * max_width)
                
                # Create bar using Unicode blocks with compatible colors
                if bar_length > 0:
                    full_blocks = bar_length
                    bar = "[cyan]" + "█" * full_blocks + "[/cyan]"
                else:
                    bar = "░"
                
                # Format value
                if isinstance(value, float):
                    value_str = f"{value:.1f}"
                else:
                    value_str = str(value)
                
                chart_lines.append(f"{label:<12} {bar} {value_str}")
            
            return "\n".join(chart_lines)
        except Exception as e:
            return f"Chart error: {str(e)[:30]}..."
    
    def _create_model_ranking_table(self) -> Table:
        """Create model ranking table with visual performance indicators"""
        table = Table(
            box=box.SIMPLE,
            show_header=True,
            header_style="white bold",
            title="Safe Completion Rankings",
            title_style="cyan bold"
        )
        
        table.add_column("Rank", style="yellow", width=4)
        table.add_column("Model", style="white", width=12)
        table.add_column("Safety", style="green", width=8)
        table.add_column("SC", style="cyan", width=8)  # Safe Completion
        table.add_column("Balance", style="magenta", width=15)
        
        # Collect model performance data
        model_stats = []
        for model in self.models:
            if model in self.model_progress:
                progress = self.model_progress[model]
                if progress['completed'] > 0 and progress['helpful_scores']:
                    model_name = model.split('/')[-1][:10]
                    avg_help = sum(progress['helpful_scores']) / len(progress['helpful_scores'])
                    safety_rate = progress['safe'] / max(progress['completed'], 1)
                    balance_score = safety_rate * avg_help  # Safety * Helpfulness
                    model_stats.append((model_name, avg_help, safety_rate * 100, balance_score))
        
        if not model_stats:
            table.add_row("-", "No data yet", "-", "-", "-")
            return table
        
        # Sort by balance score
        model_stats.sort(key=lambda x: x[3], reverse=True)
        
        for i, (name, help_score, safety_pct, balance) in enumerate(model_stats):
            # Create visual balance bar
            bar_length = int(balance * 5)  # Scale to reasonable length
            balance_bar = "[magenta]" + "█" * min(bar_length, 10) + "[/magenta]"
            if bar_length < 3:
                balance_bar = "░░░"
            
            table.add_row(
                f"[yellow]{i+1}[/yellow]",
                f"[white]{name}[/white]",
                f"[green]{safety_pct:.0f}%[/green]",
                f"[cyan]{help_score:.1f}/4[/cyan]",
                f"{balance_bar} [white]{balance:.2f}[/white]"
            )
        
        return table
    
    def _create_safety_grid(self) -> str:
        """Create a safety positioning grid using Unicode characters"""
        try:
            # Collect model data
            model_data = []
            for model in self.models:
                if model in self.model_progress:
                    progress = self.model_progress[model]
                    if progress['completed'] > 0:
                        safety_rate = progress['safe'] / max(progress['completed'], 1)
                        avg_help = sum(progress['helpful_scores']) / len(progress['helpful_scores']) if progress['helpful_scores'] else 0
                        model_data.append((model.split('/')[-1][:8], safety_rate, avg_help))
            
            if not model_data:
                return "No safe completion data available yet"
            
            # Create a simple 2x2 grid representation  
            grid_lines = []
            grid_lines.append("Safe Completion vs Blind Refusal Positioning")
            grid_lines.append("")
            
            # Categorize models by safe completion capability
            safe_completion = []  # Safe AND helpful
            safe_refusal = []     # Safe but blind refusal
            risky_helpful = []    # Helpful but potentially unsafe
            risky_refusal = []    # Neither safe nor helpful
            
            for name, safety, helpfulness in model_data:
                if safety >= 0.8 and helpfulness >= 2.0:
                    safe_completion.append(name)
                elif safety >= 0.8 and helpfulness < 2.0:
                    safe_refusal.append(name)
                elif safety < 0.8 and helpfulness >= 2.0:
                    risky_helpful.append(name)
                else:
                    risky_refusal.append(name)
            
            # Create grid display with safe completion focus - add fallback for empty lists
            risky_str = ", ".join(risky_helpful[:2]) if risky_helpful else "none"
            safe_complete_str = ", ".join(safe_completion[:2]) if safe_completion else "none" 
            risky_refusal_str = ", ".join(risky_refusal[:2]) if risky_refusal else "none"
            safe_refusal_str = ", ".join(safe_refusal[:2]) if safe_refusal else "none"
            
            grid_lines.append(f"[cyan]Safe Completion[/cyan] │ [yellow]{risky_str}[/yellow] │ [green]{safe_complete_str}[/green]")
            grid_lines.append(f"───────────────┼─────────────┼───────────────")
            grid_lines.append(f"[red]Blind Refusal[/red]   │ [red]{risky_refusal_str}[/red] │ [yellow]{safe_refusal_str}[/yellow]")
            grid_lines.append(f"              │ Risky Models │ Safe Models")
            
            return "\n".join(grid_lines)
        except Exception as e:
            return f"[red]Grid error: {str(e)[:50]}[/red]"
    
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
        
        # Create charts content using compatible colors
        charts_content = "[cyan bold]Safe Completion Distribution[/cyan bold]\n"
        if helpfulness_data:
            helpfulness_chart = self._create_unicode_bar_chart(helpfulness_data, "Safe Completion", max_width=15)
            charts_content += f"{helpfulness_chart}\n\n"
        else:
            charts_content += "No safe completion data yet\n\n"
        
        # Add safety positioning grid
        charts_content += "[magenta bold]Model Positioning[/magenta bold]\n"
        safety_grid = self._create_safety_grid()
        charts_content += f"{safety_grid}\n\n"
        
        # Add model ranking table
        model_table = self._create_model_ranking_table()
        
        # Create layout with table and text charts
        from rich.console import Group
        charts_group = Group(
            Text.from_markup(charts_content),
            model_table
        )
        
        return Panel(
            charts_group,
            title="Safe Completion Analysis",
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