import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Stream a chat completion from Claude API.
 * Yields text chunks as they arrive.
 */
export async function* streamChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}
