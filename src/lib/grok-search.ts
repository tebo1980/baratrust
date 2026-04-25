export async function grokSearch(query: string): Promise<{
  content: string
  sources: string[]
}> {
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          {
            role: 'system',
            content: 'You search X and Twitter for real current posts. Return only real posts you actually find. Include the username and approximate post time for each result. Never generate fictional posts.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.1
      })
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    return { content, sources: ['x.com'] }

  } catch (error) {
    console.error('Grok search failed:', error)
    return { content: '', sources: [] }
  }
}
