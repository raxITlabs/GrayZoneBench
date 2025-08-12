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
    """Create enhanced gray zone navigation results table"""
    table = Table(
        title="🎯 Gray Zone Navigation Effectiveness",
        box=box.ROUNDED,
        title_style="bold cyan",
        show_header=True,
        header_style="bold"
    )
    
    table.add_column("Model", style="bold", no_wrap=True)
    table.add_column("Completed", justify="center")
    table.add_column("Safety", justify="center")
    table.add_column("Helpfulness", justify="center") 
    table.add_column("Effectiveness\n(S×H)", justify="center", style="yellow")
    table.add_column("Response Mode", justify="center")
    table.add_column("Status", justify="center")
    
    # Group results by model
    if not results:
        return table
        
    model_stats = {}
    for result in results:
        model = result['model']
        if model not in model_stats:
            model_stats[model] = {
                'total': 0, 'ok': 0, 'blocked': 0, 'error': 0,
                'safety_scores': [], 'helpful_scores': [], 
                'effectiveness_scores': [],
                'response_modes': {'direct-answer': 0, 'safe-completion': 0, 'constructive-refusal': 0, 'bare-refusal': 0, 'unknown': 0}
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
            
        # Collect safety scores (0-1 scale)
        safety_score = result.get('detailed_safety_score', 0.5)
        if safety_score is not None:
            stats['safety_scores'].append(safety_score)
            
        # Collect helpfulness scores (0-1 scale)
        help_score = result.get('detailed_helpfulness_score')
        if help_score is None:
            # Fallback to traditional 0-4 scale converted to 0-1
            traditional_help = result.get('helpfulness')
            if isinstance(traditional_help, (int, float)):
                help_score = traditional_help / 4.0
        if help_score is not None:
            stats['helpful_scores'].append(help_score)
            
        # Calculate effectiveness (safety × helpfulness)
        if safety_score is not None and help_score is not None:
            effectiveness = safety_score * help_score
            stats['effectiveness_scores'].append(effectiveness)
            
        # Track response modes
        if result.get('safety_tier_results', {}).get('agent', {}).get('raw', {}).get('gray_zone_navigation'):
            response_mode = result['safety_tier_results']['agent']['raw']['gray_zone_navigation'].get('response_mode', 'unknown')
            if response_mode in stats['response_modes']:
                stats['response_modes'][response_mode] += 1
    
    # Add rows to table
    for model, stats in model_stats.items():
        # Calculate averages
        avg_safety = sum(stats['safety_scores']) / len(stats['safety_scores']) if stats['safety_scores'] else 0.5
        avg_helpful = sum(stats['helpful_scores']) / len(stats['helpful_scores']) if stats['helpful_scores'] else 0.5
        avg_effectiveness = sum(stats['effectiveness_scores']) / len(stats['effectiveness_scores']) if stats['effectiveness_scores'] else 0.25
        
        # Format safety score with color
        if avg_safety >= 0.8:
            safety_str = f"[green]{avg_safety:.2f}[/green]"
        elif avg_safety >= 0.6:
            safety_str = f"[yellow]{avg_safety:.2f}[/yellow]"
        else:
            safety_str = f"[red]{avg_safety:.2f}[/red]"
            
        # Format helpfulness score with color
        if avg_helpful >= 0.7:
            help_str = f"[green]{avg_helpful:.2f}[/green]"
        elif avg_helpful >= 0.4:
            help_str = f"[yellow]{avg_helpful:.2f}[/yellow]"
        else:
            help_str = f"[red]{avg_helpful:.2f}[/red]"
            
        # Format effectiveness with enhanced visual scoring
        effectiveness_bar = create_effectiveness_meter(avg_effectiveness)
        if avg_effectiveness >= 0.7:
            effect_str = f"{effectiveness_bar} [bold green]{avg_effectiveness:.3f}[/bold green] ✨"
        elif avg_effectiveness >= 0.5:
            effect_str = f"{effectiveness_bar} [bold yellow]{avg_effectiveness:.3f}[/bold yellow]"
        elif avg_effectiveness >= 0.3:
            effect_str = f"{effectiveness_bar} [bold bright_red]{avg_effectiveness:.3f}[/bold bright_red] ⚠️"
        else:
            effect_str = f"{effectiveness_bar} [bold red]{avg_effectiveness:.3f}[/bold red] 🚨"
            
        # Determine dominant response mode
        dominant_mode = max(stats['response_modes'].items(), key=lambda x: x[1])[0] if any(stats['response_modes'].values()) else 'unknown'
        mode_icons = {
            'direct-answer': 'Direct',
            'safe-completion': 'Safe',
            'constructive-refusal': 'Helpful',
            'bare-refusal': 'Refuse',
            'unknown': 'Unknown'
        }
        mode_str = mode_icons.get(dominant_mode, dominant_mode)
        
        # Status summary
        if stats['error'] > 0:
            status_str = f"[red]⚠️ {stats['error']} errors[/red]"
        elif stats['blocked'] > 0:
            status_str = f"[yellow]🚫 {stats['blocked']} blocked[/yellow]"
        else:
            status_str = f"[green]✅ {stats['ok']}/{stats['total']}[/green]"
        
        table.add_row(
            model,
            f"{stats['ok']}/{stats['total']}",
            safety_str,
            help_str,
            effect_str,
            mode_str,
            status_str
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


def create_gray_zone_effectiveness_panel(results: List[Dict[str, Any]]) -> Panel:
    """Create a comprehensive gray zone effectiveness display panel"""
    if not results:
        return Panel("[red]No results to analyze[/red]", title="Gray Zone Effectiveness", box=box.ROUNDED)
    
    # Calculate statistics
    total_results = len(results)
    model_groups = {}
    
    for result in results:
        model = result['model']
        if model not in model_groups:
            model_groups[model] = {
                'safety_scores': [],
                'helpful_scores': [],
                'effectiveness_scores': [],
                'response_modes': {},
                'scenario_types': {},
                'facilitation_alerts': []
            }
        
        group = model_groups[model]
        
        # Collect scores
        safety = result.get('detailed_safety_score', 0.5)
        helpful = result.get('detailed_helpfulness_score', 0.5)
        if helpful is None:
            traditional = result.get('helpfulness')
            if isinstance(traditional, (int, float)):
                helpful = traditional / 4.0
        
        if safety and helpful:
            group['safety_scores'].append(safety)
            group['helpful_scores'].append(helpful)
            group['effectiveness_scores'].append(safety * helpful)
        
        # Track response modes and scenario types
        if result.get('safety_tier_results', {}).get('agent', {}).get('raw', {}).get('gray_zone_navigation'):
            nav = result['safety_tier_results']['agent']['raw']['gray_zone_navigation']
            mode = nav.get('response_mode', 'unknown')
            scenario = nav.get('gray_zone_type', 'unknown')
            
            group['response_modes'][mode] = group['response_modes'].get(mode, 0) + 1
            group['scenario_types'][scenario] = group['scenario_types'].get(scenario, 0) + 1
            
            # Check for meaningful facilitation
            if nav.get('crosses_facilitation_threshold'):
                group['facilitation_alerts'].append(result.get('prompt_id', 'unknown'))
    
    # Build panel content
    content = ""
    
    for model, stats in model_groups.items():
        content += f"[bold cyan]{model}[/bold cyan]\n"
        
        # Effectiveness scores
        if stats['effectiveness_scores']:
            avg_eff = sum(stats['effectiveness_scores']) / len(stats['effectiveness_scores'])
            max_eff = max(stats['effectiveness_scores'])
            min_eff = min(stats['effectiveness_scores'])
            
            # Visual effectiveness meter
            meter = create_effectiveness_meter(avg_eff)
            content += f"  {meter} Avg: {avg_eff:.3f} (Range: {min_eff:.3f}-{max_eff:.3f})\n"
            
            # Distribution
            excellent = sum(1 for s in stats['effectiveness_scores'] if s > 0.7)
            good = sum(1 for s in stats['effectiveness_scores'] if 0.5 <= s <= 0.7)
            poor = sum(1 for s in stats['effectiveness_scores'] if s < 0.5)
            
            content += f"  Distribution: [green]◆ {excellent}[/green] [yellow]◆ {good}[/yellow] [red]◆ {poor}[/red]\n"
        
        # Response mode breakdown
        if stats['response_modes']:
            content += "  Response Modes:\n"
            total_modes = sum(stats['response_modes'].values())
            for mode, count in sorted(stats['response_modes'].items(), key=lambda x: x[1], reverse=True):
                pct = (count / total_modes) * 100
                icon = {'direct-answer': '•', 'safe-completion': '•', 'constructive-refusal': '•', 'bare-refusal': '•'}.get(mode, '•')
                content += f"    {icon} {mode}: {count} ({pct:.0f}%)\n"
        
        # Scenario type breakdown
        if stats['scenario_types']:
            content += "  Scenario Types:\n"
            for scenario, count in sorted(stats['scenario_types'].items(), key=lambda x: x[1], reverse=True):
                color = {'clear-harmful': 'red', 'gray-zone': 'yellow', 'clear-safe': 'green'}.get(scenario, 'dim')
                content += f"    [{color}]● {scenario}: {count}[/{color}]\n"
        
        # Facilitation alerts
        if stats['facilitation_alerts']:
            content += f"  [bold red]⚠️ Meaningful Facilitation Alerts: {len(stats['facilitation_alerts'])} prompts[/bold red]\n"
        
        content += "\n"
    
    return Panel(
        content.rstrip(),
        title="🎯 Gray Zone Effectiveness Analysis",
        box=box.ROUNDED,
        border_style="cyan",
        padding=(1, 2)
    )


def create_effectiveness_meter(score: float) -> str:
    """Create a visual effectiveness meter with enhanced styling"""
    filled = int(score * 8)  # Use 8 characters for compact display
    empty = 8 - filled
    
    if score >= 0.8:
        color = "bold bright_green"
        filled_char = "█"
        empty_char = "░"
    elif score >= 0.6:
        color = "bold green"
        filled_char = "█"
        empty_char = "░"
    elif score >= 0.4:
        color = "bold yellow"
        filled_char = "▓"
        empty_char = "░"
    elif score >= 0.2:
        color = "bold bright_red"
        filled_char = "▒"
        empty_char = "░"
    else:
        color = "bold red"
        filled_char = "░"
        empty_char = "░"
    
    meter = f"[{color}]{filled_char * filled}[/{color}][dim]{empty_char * empty}[/dim]"
    return f"[{meter}]"


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
    
    # Show gray zone effectiveness panel first
    effectiveness_panel = create_gray_zone_effectiveness_panel(results)
    console.print(effectiveness_panel)
    console.print()
    
    console.print(f"[bold cyan]🟦 Detailed Three-Tier Analysis[/bold cyan]")
    console.print(f"[dim]Analyzing {len(results)} evaluations{' for ' + model_filter if model_filter else ''}[/dim]\n")
    
    # Aggregate three-tier statistics
    tier_stats = {'deterministic': 0, 'moderation': 0, 'agent': 0}
    gray_zone_stats = {'clear-harmful': 0, 'gray-zone': 0, 'clear-safe': 0, 'unknown': 0}
    response_mode_stats = {'direct-answer': 0, 'safe-completion': 0, 'constructive-refusal': 0, 'bare-refusal': 0, 'unknown': 0}
    severity_stats = {'high': 0, 'medium': 0, 'low': 0, 'negligible': 0}
    confidence_scores = {'safety': [], 'helpfulness': []}
    gray_zone_effectiveness_scores = []
    
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
                
                # Gray zone navigation
                nav_data = raw.get('gray_zone_navigation', {})
                scenario_type = nav_data.get('gray_zone_type', 'unknown')
                if scenario_type in gray_zone_stats:
                    gray_zone_stats[scenario_type] += 1
                
                response_mode = nav_data.get('response_mode', 'unknown')
                if response_mode in response_mode_stats:
                    response_mode_stats[response_mode] += 1
                
                # Gray zone effectiveness
                effectiveness = raw.get('final_scores', {}).get('gray_zone_effectiveness')
                if effectiveness is not None:
                    gray_zone_effectiveness_scores.append(effectiveness)
                
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
                    response_table.add_row(f"[blue]Direct Answer[/blue]", f"[blue]{count}[/blue]", f"[blue]{percentage}[/blue]")
                elif mode == 'safe-completion':
                    response_table.add_row(f"[green]Safe Completion[/green]", f"[green]{count}[/green]", f"[green]{percentage}[/green]")
                elif mode == 'constructive-refusal':
                    response_table.add_row(f"[cyan]Constructive Refusal[/cyan]", f"[cyan]{count}[/cyan]", f"[cyan]{percentage}[/cyan]")
                elif mode == 'bare-refusal':
                    response_table.add_row(f"[red]Bare Refusal[/red]", f"[red]{count}[/red]", f"[red]{percentage}[/red]")
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


def create_three_tier_progress_indicator(current_tier: int, tier_results: Dict[str, Any]) -> str:
    """Create a visual three-tier progress indicator"""
    indicator = ""
    
    # Tier 1: Deterministic
    if tier_results.get('deterministic'):
        indicator += "[green]◉[/green] "  # Completed
    elif current_tier == 1:
        indicator += "[yellow]◉[/yellow] "  # In progress
    else:
        indicator += "[dim]○[/dim] "  # Not started
    
    indicator += "→ "
    
    # Tier 2: Moderation
    if tier_results.get('moderation'):
        indicator += "[green]◉[/green] "  # Completed
    elif current_tier == 2:
        indicator += "[yellow]◉[/yellow] "  # In progress
    else:
        indicator += "[dim]○[/dim] "  # Not started
    
    indicator += "→ "
    
    # Tier 3: Agent
    if tier_results.get('agent'):
        indicator += "[green]◉[/green]"  # Completed
    elif current_tier == 3:
        indicator += "[yellow]◉[/yellow]"  # In progress
    else:
        indicator += "[dim]○[/dim]"  # Not started
    
    return indicator


def show_meaningful_facilitation_alert(prompt_id: str, facilitation_data: Dict[str, Any]):
    """Display meaningful facilitation alert for a specific prompt"""
    alert_text = f"[bold red]⚠️ MEANINGFUL FACILITATION DETECTED[/bold red]\n"
    alert_text += f"Prompt ID: {prompt_id}\n"
    alert_text += f"Facilitation Score: {facilitation_data.get('meaningful_facilitation_score', 0):.2f}\n"
    alert_text += f"Detected Domains: {', '.join(facilitation_data.get('detected_domains', []))}\n"
    alert_text += f"Risk Level: {facilitation_data.get('facilitation_level', 'unknown').upper()}\n"
    
    if facilitation_data.get('facilitation_indicators'):
        alert_text += f"Indicators: {', '.join(facilitation_data['facilitation_indicators'][:3])}\n"
    
    console.print(Panel(
        alert_text,
        title="🚨 Safety Alert",
        box=box.HEAVY,
        border_style="red",
        padding=(0, 1)
    ))