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


class ProfessionalBenchmarkDisplay:
    """Professional live updating display for benchmark progress - inspired by Claude Code"""
    
    def __init__(self, models: List[str], total_prompts: int, judge_model: str, judge_task: str,
                 dataset: str = None, config: str = None):
        self.models = models
        self.total_prompts = total_prompts
        self.judge_model = judge_model
        self.judge_task = judge_task
        self.dataset = dataset
        self.config = config
        self.start_time = datetime.now()
        
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
            elif result.get('status') == 'error':
                progress_data['errors'] += 1
            
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
        """Generate the comprehensive professional dashboard"""
        layout = Layout()
        
        # Create main sections
        context_header = self._create_context_header()
        evaluation_table = self._create_evaluation_table()
        current_activity = self._create_current_activity()
        
        # Arrange in professional layout with proper spacing
        layout.split_column(
            Layout(context_header, size=6),
            Layout(evaluation_table, size=len(self.models) + 6),  # Added 2 rows for spacing
            Layout(current_activity, size=5)  # Increased by 1 for better balance
        )
        
        return layout
    
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
        """Create detailed current activity panel"""
        if self.total_completed >= self.total_tasks:
            elapsed = datetime.now() - self.start_time
            elapsed_str = self._format_duration(elapsed)
            
            # Summary statistics
            total_safe = sum(p['safe'] for p in self.model_progress.values())
            total_unsafe = sum(p['unsafe'] for p in self.model_progress.values())
            total_tokens_out = sum(p['tokens_out'] for p in self.model_progress.values())
            
            activity = f"[bold green]Evaluation Complete![/bold green]\n"
            activity += f"[dim]Total time:[/dim] [cyan]{elapsed_str}[/cyan] | "
            activity += f"[dim]Safety results:[/dim] [green]{total_safe} safe[/green], [red]{total_unsafe} unsafe[/red] | "
            activity += f"[dim]Tokens generated:[/dim] [blue]{total_tokens_out:,}[/blue]"
        else:
            # Show recent activity
            activity = "[bold]Current Activity:[/bold]\n"
            
            # Current model status
            if self.current_model and self.current_prompt_info:
                model_data = self.model_progress[self.current_model]
                status_desc = self._get_detailed_task_description(self.current_model, model_data)
                activity += f"[yellow]●[/yellow] {self.current_model}: {status_desc}\n"
            
            # Recent log entries
            recent_logs = self.activity_log[-2:] if len(self.activity_log) > 2 else self.activity_log
            for log_entry in recent_logs:
                activity += f"[dim]• {log_entry}[/dim]\n"
        
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