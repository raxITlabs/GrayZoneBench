// Test page to verify 'use cache' is working
'use cache'

async function getCachedTime() {
  'use cache'
  
  // This timestamp will be cached and won't change on refresh
  const timestamp = new Date().toISOString()
  console.log('Generating cached timestamp:', timestamp)
  
  return {
    cachedTime: timestamp,
    message: 'This timestamp is cached and will only update on revalidation'
  }
}

async function getUncachedTime() {
  // This timestamp will change on every request
  const timestamp = new Date().toISOString()
  console.log('Generating uncached timestamp:', timestamp)
  
  return {
    uncachedTime: timestamp,
    message: 'This timestamp updates on every request'
  }
}

export default async function TestCachePage() {
  const cached = await getCachedTime()
  const uncached = await getUncachedTime()
  
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Testing &apos;use cache&apos; Directive</h1>
      
      <div className="space-y-6">
        <div className="p-6 border rounded-lg bg-green-50">
          <h2 className="text-xl font-semibold text-green-800 mb-2">Cached Function</h2>
          <p className="text-sm text-gray-600 mb-2">{cached.message}</p>
          <code className="block p-2 bg-gray-100 rounded">
            {cached.cachedTime}
          </code>
        </div>
        
        <div className="p-6 border rounded-lg bg-blue-50">
          <h2 className="text-xl font-semibold text-blue-800 mb-2">Uncached Function</h2>
          <p className="text-sm text-gray-600 mb-2">{uncached.message}</p>
          <code className="block p-2 bg-gray-100 rounded">
            {uncached.uncachedTime}
          </code>
        </div>
        
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="text-sm">
            <strong>How to test:</strong> Refresh this page multiple times. 
            The cached timestamp should remain the same, while the uncached one changes every time.
          </p>
        </div>
      </div>
    </div>
  )
}