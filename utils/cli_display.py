"""
CLI Display utilities for GrayZoneBench

Beautiful terminal interface with Rich formatting and three-tier analysis insights.
"""

from typing import Any, Dict, List, Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

# Initialize rich console with natural width (constraints applied at content level)
console = Console()



def create_results_table(results: List[Dict[str, Any]]) -> Table:
    """Create a beautiful results summary table"""
    table = Table(
        title="Gray Zone Navigation Results",
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
                     judge_model: str, judge_task: str, num_prompts: int,
                     category_filter: Optional[str] = None):
    """Show configuration panel"""
    # Create judge task description
    if judge_task == "both":
        judge_desc = f"{judge_model} evaluating gray zone navigation (safety + helpfulness)"
        judge_info = "  Safety: Gray zone navigation effectiveness (0-1 scale)\n  Helpfulness: Safe-completion helpfulness (0-1 scale, displayed as 0-4)"
    elif judge_task == "safety":
        judge_desc = f"{judge_model} evaluating gray zone safety navigation"
        judge_info = "  Safety: Gray zone navigation effectiveness with meaningful facilitation threshold"
    else:
        judge_desc = f"{judge_model} evaluating safe-completion helpfulness"
        judge_info = "  Helpfulness: Safe-completion effectiveness (0-1 scale, displayed as 0-4)"
    
    config_text = f"[bold]Configuration[/bold]\n"
    config_text += f"Dataset: {dataset} ({config})\n"
    if category_filter:
        config_text += f"Category Filter: {category_filter}\n"
    config_text += f"Models: {', '.join(models)}\n"
    config_text += f"Judge: {judge_desc}\n"
    config_text += f"[dim]{judge_info}[/dim]\n"
    config_text += f"Prompts: {num_prompts}"
    
    console.print(Panel(config_text, title="Setup", box=box.ROUNDED))
    console.print()


def show_completion_panel(output_dir: str, elapsed_time: Optional[str] = None, results: Optional[List[Dict[str, Any]]] = None):
    """Show completion message with three-tier gray zone navigation analysis summary"""
    completion_text = f"[bold]Gray Zone Navigation Analysis Complete[/bold]\n\n"
    
    if elapsed_time:
        completion_text += f"Total time: {elapsed_time}\n\n"
    
    # Add three-tier analysis summary if results provided
    if results:
        total_evaluations = len(results)
        tier_3_completions = sum(1 for r in results if r.get('safety_tier_results', {}).get('agent'))
        gray_zone_scenarios = sum(1 for r in results 
                                if r.get('safety_tier_results', {}).get('agent', {}).get('raw', {})
                                .get('gray_zone_navigation', {}).get('gray_zone_type') == 'gray-zone')
        clear_harmful = sum(1 for r in results 
                          if r.get('safety_tier_results', {}).get('agent', {}).get('raw', {})
                          .get('gray_zone_navigation', {}).get('gray_zone_type') == 'clear-harmful')
        
        completion_text += f"[green]🟦 Gray Zone Analysis Summary[/green]\n"
        completion_text += f"Total evaluations: {total_evaluations}\n"
        completion_text += f"Three-tier completions: {tier_3_completions}\n"
        if gray_zone_scenarios > 0:
            completion_text += f"Gray zone scenarios: [yellow]{gray_zone_scenarios}[/yellow]\n"
        if clear_harmful > 0:
            completion_text += f"Clear-harmful scenarios: [red]{clear_harmful}[/red]\n"
        completion_text += "\n"
    
    completion_text += f"[bold]Output Files[/bold]\n"
    completion_text += f"Detailed results: [dim]{output_dir}/results_*.json[/dim]\n"
    completion_text += f"Gray zone analysis: [dim]{output_dir}/*_tier_results.json[/dim]\n"
    completion_text += f"Run logs: [dim]{output_dir}/run.log[/dim]"
    
    console.print(Panel(
        completion_text,
        title="Gray Zone Navigation Results",
        box=box.ROUNDED,
        padding=(1, 2)
    ))


def show_detailed_analysis(results: List[Dict[str, Any]], model_filter: str = None):
    """Show detailed three-tier analysis insights with progressive disclosure"""
    if not results:
        console.print("[red]No results to analyze[/red]")
        return
    
    # Filter by model if specified
    if model_filter:
        results = [r for r in results if model_filter.lower() in r['model'].lower()]
        if not results:
            console.print(f"[red]No results found for model filter: {model_filter}[/red]")
            return
    
    console.print(f"\n[bold cyan]🟦 Detailed Three-Tier Analysis[/bold cyan]")
    console.print(f"[dim]Analyzing {len(results)} evaluations{' for ' + model_filter if model_filter else ''}[/dim]\n")
    
    # Aggregate three-tier statistics
    tier_stats = {'deterministic': 0, 'moderation': 0, 'agent': 0}
    intent_stats = {'malicious': 0, 'legitimate': 0, 'unknown': 0}
    severity_stats = {'high': 0, 'medium': 0, 'low': 0, 'negligible': 0}
    confidence_scores = {'safety': [], 'helpfulness': []}
    
    for result in results:
        # Tier completion tracking
        safety_tiers = result.get('safety_tier_results', {})
        if safety_tiers.get('deterministic'):
            tier_stats['deterministic'] += 1
        if safety_tiers.get('moderation'):
            tier_stats['moderation'] += 1
        if safety_tiers.get('agent'):
            tier_stats['agent'] += 1
            
            # Extract agent insights
            agent_data = safety_tiers['agent']
            if agent_data.get('raw'):
                raw = agent_data['raw']
                
                # Intent classification
                intent_data = raw.get('intent_classification', {})
                intent = intent_data.get('intent', 'unknown')
                if intent in intent_stats:
                    intent_stats[intent] += 1
                
                # Severity assessment
                severity_data = raw.get('severity_assessment', {})
                harm_level = severity_data.get('harm_level', 'unknown')
                if harm_level in severity_stats:
                    severity_stats[harm_level] += 1
        
        # Confidence tracking
        if result.get('safety_confidence'):
            confidence_scores['safety'].append(result['safety_confidence'])
        if result.get('helpfulness_confidence'):
            confidence_scores['helpfulness'].append(result['helpfulness_confidence'])
    
    # Create tier progression table
    tier_table = Table(title="Three-Tier Progression", box=box.SIMPLE_HEAD, show_header=True)
    tier_table.add_column("Tier", style="bold")
    tier_table.add_column("Description", style="dim")
    tier_table.add_column("Completed", justify="center")
    tier_table.add_column("Success Rate", justify="center")
    
    total_results = len(results)
    tier_table.add_row(
        "🟦 Tier 1", "Deterministic analysis", 
        str(tier_stats['deterministic']),
        f"{(tier_stats['deterministic']/total_results)*100:.0f}%" if total_results > 0 else "0%"
    )
    tier_table.add_row(
        "🟦 Tier 2", "OpenAI moderation", 
        str(tier_stats['moderation']),
        f"{(tier_stats['moderation']/total_results)*100:.0f}%" if total_results > 0 else "0%"
    )
    tier_table.add_row(
        "🤖 Tier 3", "LangGraph agents", 
        str(tier_stats['agent']),
        f"[green]{(tier_stats['agent']/total_results)*100:.0f}%[/green]" if total_results > 0 else "0%"
    )
    
    console.print(tier_table)
    console.print()
    
    # Gray zone navigation breakdown
    if any(gray_zone_stats.values()):
        gray_zone_table = Table(title="Gray Zone Navigation Results", box=box.SIMPLE_HEAD, show_header=True)
        gray_zone_table.add_column("Scenario Type", style="bold")
        gray_zone_table.add_column("Count", justify="center")
        gray_zone_table.add_column("Percentage", justify="center")
        
        total_scenarios = sum(gray_zone_stats.values())
        for scenario_type, count in gray_zone_stats.items():
            if count > 0:
                percentage = f"{(count/total_scenarios)*100:.1f}%"
                if scenario_type == 'clear-harmful':
                    gray_zone_table.add_row(f"[red]🟥 Clear-Harmful[/red]", f"[red]{count}[/red]", f"[red]{percentage}[/red]")
                elif scenario_type == 'gray-zone':
                    gray_zone_table.add_row(f"[yellow]🟧 Gray-Zone[/yellow]", f"[yellow]{count}[/yellow]", f"[yellow]{percentage}[/yellow]")
                elif scenario_type == 'clear-safe':
                    gray_zone_table.add_row(f"[green]🟩 Clear-Safe[/green]", f"[green]{count}[/green]", f"[green]{percentage}[/green]")
                else:
                    gray_zone_table.add_row(f"[dim]? Unknown[/dim]", str(count), percentage)
        
        console.print(gray_zone_table)
        console.print()
    
    # Response mode breakdown
    if any(response_mode_stats.values()):
        response_table = Table(title="Response Mode Distribution", box=box.SIMPLE_HEAD, show_header=True)
        response_table.add_column("Response Mode", style="bold")
        response_table.add_column("Count", justify="center")
        response_table.add_column("Effectiveness", justify="center")
        
        total_modes = sum(response_mode_stats.values())
        for mode, count in response_mode_stats.items():
            if count > 0:
                percentage = f"{(count/total_modes)*100:.1f}%"
                if mode == 'direct-answer':
                    response_table.add_row(f"[blue]📝 Direct Answer[/blue]", f"[blue]{count}[/blue]", f"[blue]{percentage}[/blue]")
                elif mode == 'safe-completion':
                    response_table.add_row(f"[green]🛡️ Safe Completion[/green]", f"[green]{count}[/green]", f"[green]{percentage}[/green]")
                elif mode == 'constructive-refusal':
                    response_table.add_row(f"[cyan]🔄 Constructive Refusal[/cyan]", f"[cyan]{count}[/cyan]", f"[cyan]{percentage}[/cyan]")
                else:
                    response_table.add_row(f"[dim]? Unknown[/dim]", str(count), percentage)
        
        console.print(response_table)
        console.print()
    
    # Severity assessment breakdown
    if any(severity_stats.values()):
        severity_table = Table(title="Severity Assessment", box=box.SIMPLE_HEAD, show_header=True)
        severity_table.add_column("Harm Level", style="bold")
        severity_table.add_column("Count", justify="center")
        severity_table.add_column("Risk Profile", justify="center")
        
        for severity, count in severity_stats.items():
            if count > 0:
                if severity == 'high':
                    severity_table.add_row("[red]🟥 High[/red]", f"[red]{count}[/red]", "[red]Immediate concern[/red]")
                elif severity == 'medium':
                    severity_table.add_row("[yellow]🟧 Medium[/yellow]", f"[yellow]{count}[/yellow]", "[yellow]Monitor closely[/yellow]")
                elif severity == 'low':
                    severity_table.add_row("[blue]🟦 Low[/blue]", f"[blue]{count}[/blue]", "[blue]Standard review[/blue]")
                elif severity == 'negligible':
                    severity_table.add_row("[green]🟩 Negligible[/green]", f"[green]{count}[/green]", "[green]Minimal risk[/green]")
        
        console.print(severity_table)
        console.print()
    
    # Gray zone navigation effectiveness analysis
    if gray_zone_effectiveness_scores or confidence_scores['safety'] or confidence_scores['helpfulness']:
        conf_text = "[bold]Gray Zone Navigation Effectiveness[/bold]\n"
        
        if gray_zone_effectiveness_scores:
            avg_effectiveness = sum(gray_zone_effectiveness_scores) / len(gray_zone_effectiveness_scores)
            conf_text += f"Average effectiveness (safety × helpfulness): {avg_effectiveness:.3f}\n"
            
            excellent = sum(1 for x in gray_zone_effectiveness_scores if x > 0.8)
            good = sum(1 for x in gray_zone_effectiveness_scores if 0.6 < x <= 0.8)
            fair = sum(1 for x in gray_zone_effectiveness_scores if 0.4 < x <= 0.6)
            poor = sum(1 for x in gray_zone_effectiveness_scores if x <= 0.4)
            
            conf_text += f"Distribution: [green]{excellent} excellent[/green] | [blue]{good} good[/blue] | [yellow]{fair} fair[/yellow] | [red]{poor} poor[/red]\n\n"
        
        if confidence_scores['safety']:
            avg_safety_conf = sum(confidence_scores['safety']) / len(confidence_scores['safety'])
            conf_text += f"Safety navigation confidence: {avg_safety_conf:.2f} (n={len(confidence_scores['safety'])})\n"
        
        if confidence_scores['helpfulness']:
            avg_help_conf = sum(confidence_scores['helpfulness']) / len(confidence_scores['helpfulness'])
            conf_text += f"Safe-completion confidence: {avg_help_conf:.2f} (n={len(confidence_scores['helpfulness'])})\n"
        
        # Overall system confidence
        all_confs = confidence_scores['safety'] + confidence_scores['helpfulness']
        if all_confs:
            overall_conf = sum(all_confs) / len(all_confs)
            if overall_conf >= 0.8:
                conf_text += f"[green]Overall navigation confidence: {overall_conf:.2f} (High reliability)[/green]"
            elif overall_conf >= 0.6:
                conf_text += f"[yellow]Overall navigation confidence: {overall_conf:.2f} (Moderate reliability)[/yellow]"
            else:
                conf_text += f"[red]Overall navigation confidence: {overall_conf:.2f} (Review recommended)[/red]"
        
        console.print(Panel(conf_text, title="Gray Zone Navigation Metrics", box=box.ROUNDED))
    
    console.print(f"\n[dim]🟧 Tip: Use filters to analyze specific models for gray zone navigation patterns[/dim]")