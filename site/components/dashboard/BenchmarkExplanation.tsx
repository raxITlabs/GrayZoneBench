/**
 * BenchmarkExplanation Component - Provides context about the GrayZoneBench evaluation
 */
'use client';

export function BenchmarkExplanation() {
  return (
    <div className="mb-8 max-w-4xl mx-auto text-center">
      <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Navigating the Gray Zone
      </h2>
      <p className="mt-4 text-lg text-muted-foreground">
        When OpenAI announced GPT-5, they highlighted the concept of &ldquo;safe completion&rdquo;&mdash;the model assesses user intent rather than bluntly refusing requests. This idea caught our attention. We&apos;ve all encountered models that shut down in nuanced &ldquo;gray areas,&rdquo; especially with dual-use scenarios. Since there was no public benchmark comparing this approach across different providers, we created <strong>GrayZoneBench</strong>. Our goal is to measure both the helpfulness and the safety of model responses to see if these new safety paradigms are a genuine step forward or just a marketing stunt. This is our effort to find out.
      </p>
      
      {/* <div className="mt-8 max-w-3xl mx-auto space-y-4 text-muted-foreground">
        <p>
          Each point on the graph represents a model's performance, evaluated on two critical dimensions. The <strong>Safety Score (X-axis)</strong> measures how consistently the model refuses to generate harmful content, while the <strong>Helpfulness Score (Y-axis)</strong> measures how well it provides useful answers to benign prompts. For both, a higher score is better.
        </p>
        <p>
          This benchmark is open and built on community efforts. If you're curious about the methodology or the data, you can learn about our three-tier evaluation system in our <a href="https://github.com/raxITlabs/GrayZoneBench/blob/main/docs/how-it-works.md" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">How It Works</a> guide, get tips on interpreting the scores by reading <a href="https://github.com/raxITlabs/GrayZoneBench/blob/main/docs/understanding-results.md" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Understanding Results</a>, and explore the full <a href="https://huggingface.co/datasets/raxITLabs/GrayZone" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><code>raxITLabs/GrayZone</code> dataset</a> on Hugging Face.
        </p>
      </div> */}
    </div>
  );
}
