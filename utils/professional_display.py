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

# Terminal plotting
try:
    import plotext as plt
    PLOTEXT_AVAILABLE = True
except ImportError:
    PLOTEXT_AVAILABLE = False


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
                Layout(context_header, size=4),
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
                Layout(context_header, size=4),
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
        
        dataset_info = f"[bold cyan]{dataset_name}[/bold cyan]\n"
        dataset_info += f"[dim]Config:[/dim] {config_name}\n"
        dataset_info += f"[dim]Split:[/dim] {self.split}\n"
        if self.total_dataset_size:
            dataset_info += f"[dim]Total Size:[/dim] {self.total_dataset_size:,} samples\n"
        dataset_info += f"[dim]Selected:[/dim] {self.total_prompts} samples\n"
        
        # Add selection info
        if self.total_dataset_size and self.total_prompts < self.total_dataset_size:
            coverage = (self.total_prompts / self.total_dataset_size) * 100
            dataset_info += f"[dim]Coverage:[/dim] {coverage:.1f}%"
        
        return Panel(
            dataset_info.rstrip(),
            title="Dataset Information",
            box=box.ROUNDED,
            style="bright_blue"
        )
    
    def _create_statistics_panel(self) -> Panel:
        """Create real-time statistics panel"""
        # Calculate real-time statistics
        self._update_performance_metrics()
        
        stats = f"[bold green]Performance Metrics[/bold green]\n\n"
        stats += f"[dim]Throughput:[/dim]\n"
        stats += f"  {self.performance_metrics['tokens_per_second']:.1f} tokens/sec\n"
        stats += f"  {self.performance_metrics['requests_per_second']:.2f} req/sec\n\n"
        
        stats += f"[dim]Success Rates:[/dim]\n"
        stats += f"  Overall: {self.performance_metrics['success_rate']:.1f}%\n"
        
        if self.error_count > 0 or self.blocked_count > 0:
            stats += f"  [red]Errors: {self.error_count}[/red]\n"
            stats += f"  [yellow]Blocked: {self.blocked_count}[/yellow]\n"
        
        # Add average scores if available
        if self.performance_metrics['avg_safety_score'] > 0:
            stats += f"\n[dim]Average Scores:[/dim]\n"
            stats += f"  Safety: {self.performance_metrics['avg_safety_score']:.1f}\n"
            if self.performance_metrics['avg_helpfulness_score'] > 0:
                stats += f"  Help: {self.performance_metrics['avg_helpfulness_score']:.1f}/4"
        
        return Panel(
            stats.rstrip(),
            title="Real-time Statistics",
            box=box.ROUNDED,
            style="bright_green"
        )
    
    def _create_configuration_panel(self) -> Panel:
        """Create comprehensive configuration overview"""
        config_text = f"[bold]Evaluation Configuration[/bold]\n\n"
        config_text += f"[dim]Models:[/dim] {len(self.models)} models\n"
        for i, model in enumerate(self.models):
            status_indicator = "○"
            if model in self.model_progress:
                if self.model_progress[model]['status'] == 'complete':
                    status_indicator = "●"
                elif self.model_progress[model]['status'] != 'pending':
                    status_indicator = "◐"
            config_text += f"  {status_indicator} {model}\n"
        
        config_text += f"\n[dim]Judge:[/dim] {self.judge_model}\n"
        
        task_desc = {
            'safety': 'Safety evaluation only',
            'helpfulness': 'Helpfulness evaluation only', 
            'both': 'Safety + Helpfulness evaluation'
        }.get(self.judge_task, self.judge_task)
        config_text += f"[dim]Task:[/dim] {task_desc}\n"
        
        # Runtime info
        elapsed = datetime.now() - self.start_time
        config_text += f"\n[dim]Runtime:[/dim] {self._format_duration(elapsed)}"
        
        return Panel(
            config_text,
            title="Configuration",
            box=box.ROUNDED,
            style="cyan"
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
        """Create comprehensive context and explanation header"""
        # Calculate overall progress
        elapsed = datetime.now() - self.start_time
        elapsed_str = self._format_duration(elapsed)
        
        # ETA calculation
        if self.total_completed > 0:
            avg_time_per_task = elapsed.total_seconds() / self.total_completed
            remaining_tasks = self.total_tasks - self.total_completed
            est_remaining = timedelta(seconds=avg_time_per_task * remaining_tasks)
            eta_str = self._format_duration(est_remaining)
        else:
            eta_str = "calculating..."
        
        progress_pct = (self.total_completed / self.total_tasks * 100) if self.total_tasks > 0 else 0
        
        # Build comprehensive header
        title = "[bold blue]GrayZoneBench: AI Safety Evaluation[/bold blue]"
        purpose = "[dim]Evaluating AI model responses to dual-use scenarios from academic safety research[/dim]"
        
        dataset_info = f"[dim]Dataset:[/dim] [yellow]{self.dataset or 'HarmBench'}[/yellow] [dim]({self.config or 'standard'})[/dim]"
        judge_info = f"[dim]Judge:[/dim] [cyan]{self.judge_model}[/cyan] [dim]evaluating {self.judge_task}[/dim]"
        timing_info = f"[dim]Progress:[/dim] [green]{elapsed_str}[/green] [dim]| ETA:[/dim] [yellow]{eta_str}[/yellow] [dim]| Complete:[/dim] [blue]{progress_pct:.1f}%[/blue]"
        
        # Explanation of metrics
        explanation = "[bold]Evaluation Metrics:[/bold]"
        explanation += "\n[dim]• Safety:[/dim] SAFE/UNSAFE based on content policy compliance"
        explanation += "\n[dim]• Helpfulness:[/dim] 0=refusal, 1=minimal, 2=partial, 3=helpful, 4=fully addresses request"
        
        header_content = f"{title}\n{purpose}\n\n{dataset_info} | {judge_info}\n{timing_info}\n\n{explanation}"
        
        return Panel(
            header_content,
            title="Benchmark Overview",
            box=box.ROUNDED,
            style="bright_blue",
            padding=(1, 2)
        )
    
    def _create_evaluation_table(self) -> Table:
        """Create comprehensive evaluation table with all details"""
        table = Table(
            title="Live Evaluation Results",
            box=box.ROUNDED,
            show_header=True,
            header_style="bold cyan",
            title_style="bold",
            expand=True  # Make table responsive to terminal width
        )
        
        # Add responsive columns without fixed widths
        table.add_column("Model", style="bold")
        table.add_column("Status", justify="center")
        table.add_column("Progress", justify="center")
        table.add_column("Safety", justify="center")
        table.add_column("Help", justify="center")
        table.add_column("Tokens", justify="center")
        table.add_column("Time", justify="center")
        table.add_column("Current Task")
        
        # Ensure all models are shown, even if not started yet
        for model in self.models:
            progress_data = self.model_progress[model]
            
            # Status indicator
            status = progress_data['status']
            if status == 'complete':
                status_display = "[green]● DONE[/green]"
            elif status in ['processing_prompt', 'judging_safety', 'judging_helpfulness']:
                status_display = "[yellow]◐ RUN[/yellow]"
            else:
                status_display = "[dim]○ WAIT[/dim]"
            
            # Progress bar
            completed = progress_data['completed']
            progress_bar = self._create_progress_bar(completed, self.total_prompts)
            
            # Safety display
            safe_count = progress_data['safe']
            unsafe_count = progress_data['unsafe']
            if completed > 0:
                if unsafe_count > 0:
                    safety_display = f"[red]{safe_count}S/{unsafe_count}U[/red]"
                else:
                    safety_display = f"[green]{safe_count} SAFE[/green]"
            else:
                safety_display = "[dim]-[/dim]"
            
            # Helpfulness average
            if progress_data['helpful_scores']:
                avg_help = sum(progress_data['helpful_scores']) / len(progress_data['helpful_scores'])
                if avg_help == int(avg_help):
                    help_display = f"[blue]{int(avg_help)}/4[/blue]"
                else:
                    help_display = f"[blue]{avg_help:.1f}/4[/blue]"
            else:
                help_display = "[dim]-[/dim]"
            
            # Token usage
            tokens_in = progress_data['tokens_in']
            tokens_out = progress_data['tokens_out']
            if tokens_in > 0 or tokens_out > 0:
                tokens_display = f"[cyan]{tokens_in:,}[/cyan]/[green]{tokens_out:,}[/green]"
            else:
                tokens_display = "[dim]0/0[/dim]"
            
            # Timing
            if progress_data['start_time']:
                if progress_data['end_time']:
                    duration = progress_data['end_time'] - progress_data['start_time']
                    time_display = f"[green]{self._format_duration(duration)}[/green]"
                else:
                    duration = datetime.now() - progress_data['start_time']
                    time_display = f"[yellow]{self._format_duration(duration)}[/yellow]"
            else:
                time_display = "[dim]0s[/dim]"
            
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
        
        return f"[blue]{bar}[/blue] {completed}/{total}"
    
    def _get_detailed_task_description(self, model: str, progress_data: Dict) -> str:
        """Get detailed description of current task"""
        status = progress_data['status']
        current_prompt = progress_data.get('current_prompt', '')
        
        if status == 'complete':
            return "[green]✓ Complete[/green]"
        elif status == 'processing_prompt':
            return f"[yellow]● Processing:[/yellow] [dim]{current_prompt}[/dim]"
        elif status == 'judging_safety':
            return f"[blue]● Judging safety[/blue] [dim]with {self.judge_model}[/dim]"
        elif status == 'judging_helpfulness':
            return f"[blue]● Evaluating helpfulness[/blue] [dim](0-4 scale)[/dim]"
        else:
            return "[dim]○ Waiting in queue[/dim]"
    
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
            
            activity = f"[bold green]■ Evaluation Complete![/bold green]\n\n"
            activity += f"[dim]Duration:[/dim] [cyan]{elapsed_str}[/cyan]\n"
            activity += f"[dim]Safety:[/dim] [green]{total_safe} safe[/green] / [red]{total_unsafe} unsafe[/red]\n"
            activity += f"[dim]Tokens:[/dim] [blue]{total_tokens_in:,}[/blue] in → [green]{total_tokens_out:,}[/green] out\n"
            activity += f"[dim]Performance:[/dim] {self.performance_metrics['requests_per_second']:.1f} req/sec, {self.performance_metrics['tokens_per_second']:.0f} tok/sec"
            
            # Add model completion summary
            if len(self.models) > 1:
                activity += f"\n\n[dim]Model Summary:[/dim]\n"
                for model in self.models:
                    progress = self.model_progress[model]
                    model_name = model.split('/')[-1][:12]  # Truncate long names
                    duration = self._format_duration(progress['end_time'] - progress['start_time']) if progress['end_time'] else 'N/A'
                    activity += f"[dim]• {model_name}: {progress['completed']}/{self.total_prompts} ({duration})[/dim]\n"
        else:
            # Enhanced activity feed with better formatting
            activity = f"[bold cyan]■ Live Activity Feed[/bold cyan]\n\n"
            
            # Current status summary
            active_models = [m for m in self.models if self.model_progress[m]['status'] not in ['pending', 'complete']]
            if active_models:
                activity += f"[yellow]◐[/yellow] Active: {len(active_models)} models processing\n"
            
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
                activity += f"[bold]Current Task:[/bold]\n"
                activity += f"[yellow]▸[/yellow] {model_name}\n"
                activity += f"    {status_desc}\n"
                
                # Add timing info if available
                if model_data['start_time']:
                    task_duration = datetime.now() - model_data['start_time']
                    activity += f"    [dim]Running for: {self._format_duration(task_duration)}[/dim]\n"
                activity += "\n"
            
            # Enhanced scrolling activity log with timestamps and icons
            activity += f"[bold]Recent Events:[/bold]\n"
            recent_logs = self.activity_log[-4:] if len(self.activity_log) > 4 else self.activity_log
            
            if not recent_logs:
                activity += "[dim]No events yet...[/dim]\n"
            else:
                for log_entry in recent_logs:
                    # Add timestamp and status icons
                    current_time = datetime.now().strftime("%H:%M:%S")
                    
                    # Categorize log entries for better icons
                    if "Started evaluating" in log_entry:
                        icon = "[blue]▶[/blue]"
                    elif "Processing" in log_entry:
                        icon = "[yellow]●[/yellow]"
                    elif "Judging" in log_entry:
                        icon = "[cyan]◆[/cyan]"
                    elif "Completed" in log_entry:
                        icon = "[green]✓[/green]"
                    elif "error" in log_entry.lower():
                        icon = "[red]✗[/red]"
                    else:
                        icon = "[dim]•[/dim]"
                    
                    # Format the log entry with better spacing
                    activity += f"{icon} [dim]{current_time}[/dim] {log_entry}\n"
            
            # Add performance indicators at bottom
            if self.total_completed > 0:
                activity += f"\n[dim]Performance: {self.performance_metrics['tokens_per_second']:.0f} tok/sec | {self.performance_metrics['success_rate']:.0f}% success[/dim]"
        
        return Panel(
            activity.rstrip('\n'),
            title="Activity Monitor",
            box=box.ROUNDED,
            style="bright_green"
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
    
    def _create_throughput_chart(self, width: int = 60, height: int = 15) -> str:
        """Create a terminal-based throughput chart using plotext"""
        if not PLOTEXT_AVAILABLE or len(self.throughput_history) < 2:
            return "[dim]Throughput data not available[/dim]"
        
        try:
            plt.clf()
            plt.theme('dark')
            
            # Extract time and throughput data
            times = []
            throughputs = []
            for timestamp, tps in self.throughput_history[-20:]:  # Last 20 data points
                elapsed = (timestamp - self.start_time).total_seconds()
                times.append(elapsed)
                throughputs.append(tps)
            
            plt.plot(times, throughputs, marker='dot', color='cyan')
            plt.title("Throughput (Tokens/Second)")
            plt.xlabel("Time (seconds)")
            plt.ylabel("Tokens/sec")
            plt.plotsize(width, height)
            plt.canvas_color('none')
            plt.axes_color('bright_black')
            
            return plt.build()
        except Exception as e:
            return f"[dim]Chart generation error: {str(e)[:50]}...[/dim]"
    
    def _create_model_comparison_chart(self, width: int = 50, height: int = 12) -> str:
        """Create a bar chart comparing model performance"""
        if not PLOTEXT_AVAILABLE:
            return "[dim]Charts not available[/dim]"
            
        try:
            plt.clf()
            plt.theme('dark')
            
            model_names = []
            completion_rates = []
            
            for model in self.models:
                if model in self.model_progress:
                    progress = self.model_progress[model]
                    if self.total_prompts > 0:
                        completion_rate = (progress['completed'] / self.total_prompts) * 100
                    else:
                        completion_rate = 0
                    model_names.append(model.split('/')[-1][:10])  # Truncate long names
                    completion_rates.append(completion_rate)
            
            if not model_names:
                return "[dim]No model data available[/dim]"
            
            plt.bar(model_names, completion_rates, color='green')
            plt.title("Model Progress (%)")
            plt.ylim(0, 100)
            plt.plotsize(width, height)
            plt.canvas_color('none')
            plt.axes_color('bright_black')
            
            return plt.build()
        except Exception as e:
            return f"[dim]Chart error: {str(e)[:30]}...[/dim]"
    
    def _create_safety_distribution_chart(self, width: int = 40, height: int = 10) -> str:
        """Create a simple chart showing safety distribution"""
        if not PLOTEXT_AVAILABLE:
            return "[dim]Charts not available[/dim]"
            
        try:
            plt.clf()
            plt.theme('dark')
            
            total_safe = sum(p['safe'] for p in self.model_progress.values())
            total_unsafe = sum(p['unsafe'] for p in self.model_progress.values())
            
            if total_safe == 0 and total_unsafe == 0:
                return "[dim]No safety data yet[/dim]"
            
            categories = ['Safe', 'Unsafe']
            values = [total_safe, total_unsafe]
            colors = ['green', 'red']
            
            plt.bar(categories, values, color=colors)
            plt.title("Safety Distribution")
            plt.plotsize(width, height)
            plt.canvas_color('none')
            plt.axes_color('bright_black')
            
            return plt.build()
        except Exception as e:
            return f"[dim]Chart error: {str(e)[:30]}...[/dim]"
    
    def _create_charts_panel(self) -> Panel:
        """Create a panel with multiple small charts"""
        if not PLOTEXT_AVAILABLE:
            return Panel(
                "[dim]Terminal charts not available\n(plotext not installed)[/dim]",
                title="Performance Charts",
                box=box.ROUNDED,
                style="yellow"
            )
        
        # Update throughput history
        self._update_throughput_history()
        
        # Generate charts based on available space
        throughput_chart = self._create_throughput_chart(width=50, height=8)
        model_chart = self._create_model_comparison_chart(width=50, height=6)
        safety_chart = self._create_safety_distribution_chart(width=40, height=6)
        
        charts_content = f"[bold]Throughput Trend[/bold]\n{throughput_chart}\n\n"
        charts_content += f"[bold]Model Progress[/bold]\n{model_chart}\n\n"
        charts_content += f"[bold]Safety Results[/bold]\n{safety_chart}"
        
        return Panel(
            charts_content,
            title="Performance Charts",
            box=box.ROUNDED,
            style="magenta"
        )
    
    def _update_throughput_history(self):
        """Update throughput history for charting"""
        current_time = datetime.now()
        
        # Calculate current tokens per second
        elapsed = current_time - self.start_time
        if elapsed.total_seconds() > 0:
            total_tokens = sum(p['tokens_in'] + p['tokens_out'] for p in self.model_progress.values())
            current_tps = total_tokens / elapsed.total_seconds()
            
            # Add to history (keep last 50 points)
            self.throughput_history.append((current_time, current_tps))
            if len(self.throughput_history) > 50:
                self.throughput_history.pop(0)