"""
CLI Display utilities for GrayZoneBench

Beautiful terminal interface with Rich formatting.
"""

from typing import Any, Dict, List, Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

# Initialize rich console
console = Console()



def create_results_table(results: List[Dict[str, Any]]) -> Table:
    """Create a beautiful results summary table"""
    table = Table(
        title="GrayZoneBench Results",
        box=box.ROUNDED,
        title_style="bold",
        show_header=True,
        header_style="bold"
    )
    
    table.add_column("Model", style="bold", no_wrap=True)
    table.add_column("Total", justify="center")
    table.add_column("OK", justify="center")
    table.add_column("Blocked", justify="center")
    table.add_column("Errors", justify="center")
    table.add_column("Safe", justify="center")
    table.add_column("Helpful", justify="center")
    
    # Group results by model
    if not results:
        return table
        
    model_stats = {}
    for result in results:
        model = result['model']
        if model not in model_stats:
            model_stats[model] = {
                'total': 0, 'ok': 0, 'blocked': 0, 'error': 0,
                'safe': 0, 'helpful_scores': [], 'helpful_count': 0
            }
        
        stats = model_stats[model]
        stats['total'] += 1
        
        # Status counts
        if result['status'] == 'ok':
            stats['ok'] += 1
        elif result['status'] == 'api_blocked':
            stats['blocked'] += 1
        else:
            stats['error'] += 1
            
        # Safety counts
        if result.get('safety') == 'SAFE':
            stats['safe'] += 1
            
        # Helpfulness average (only for numeric scores)
        help_score = result.get('helpfulness')
        if isinstance(help_score, (int, float)) and help_score is not None:
            stats['helpful_scores'].append(help_score)
            stats['helpful_count'] += 1
    
    # Add rows to table
    for model, stats in model_stats.items():
        if stats['helpful_scores']:
            avg = sum(stats['helpful_scores'])/len(stats['helpful_scores'])
            # Show integer if it's a whole number, otherwise show decimal
            if avg == int(avg):
                avg_helpful = str(int(avg))
            else:
                avg_helpful = f"{avg:.1f}"
        else:
            avg_helpful = "N/A"
        
        # Add status indicators with simple colors
        ok_str = f"[green]{stats['ok']}[/green]" if stats['ok'] > 0 else str(stats['ok'])
        blocked_str = f"[yellow]{stats['blocked']}[/yellow]" if stats['blocked'] > 0 else str(stats['blocked'])
        error_str = f"[red]{stats['error']}[/red]" if stats['error'] > 0 else str(stats['error'])
        safe_str = f"[green]{stats['safe']}/{stats['total']}[/green]" if stats['safe'] == stats['total'] else f"{stats['safe']}/{stats['total']}"
        
        table.add_row(
            model,
            str(stats['total']),
            ok_str,
            blocked_str,
            error_str,
            safe_str,
            f"{avg_helpful}/4"
        )
    
    return table


def show_config_panel(dataset: str, config: str, models: List[str], 
                     judge_model: str, judge_task: str, num_prompts: int):
    """Show configuration panel"""
    # Create judge task description
    if judge_task == "both":
        judge_desc = f"{judge_model} evaluating safety and helpfulness"
        judge_info = "  Safety: SAFE/UNSAFE rating of response content\n  Helpfulness: 0-4 scale (0=refusal, 4=somewhat helpful)"
    elif judge_task == "safety":
        judge_desc = f"{judge_model} evaluating safety"
        judge_info = "  Safety: SAFE/UNSAFE rating of response content"
    else:
        judge_desc = f"{judge_model} evaluating helpfulness"
        judge_info = "  Helpfulness: 0-4 scale (0=refusal, 4=somewhat helpful)"
    
    config_text = f"[bold]Configuration[/bold]\n"
    config_text += f"Dataset: {dataset} ({config})\n"
    config_text += f"Models: {', '.join(models)}\n"
    config_text += f"Judge: {judge_desc}\n"
    config_text += f"[dim]{judge_info}[/dim]\n"
    config_text += f"Prompts: {num_prompts}"
    
    console.print(Panel(config_text, title="Setup", box=box.ROUNDED))
    console.print()


def show_completion_panel(output_dir: str, elapsed_time: Optional[str] = None):
    """Show completion message"""
    completion_text = f"[bold]Evaluation Complete[/bold]\n\n"
    if elapsed_time:
        completion_text += f"Total time: {elapsed_time}\n\n"
    completion_text += f"Detailed results saved to: [dim]{output_dir}[/dim]\n"
    completion_text += f"Logs available at: [dim]{output_dir}/run.log[/dim]"
    
    console.print(Panel(
        completion_text,
        title="Results",
        box=box.ROUNDED,
        padding=(1, 2)
    ))