import { readFile } from 'fs/promises'
import { join } from 'path'

const PROMPTS_DIR = join(process.cwd(), 'server', 'prompts')

/** Load a prompt template and replace {{variable}} placeholders */
export async function loadPrompt(
  name: string,
  variables: Record<string, string> = {},
): Promise<string> {
  const content = await readFile(join(PROMPTS_DIR, `${name}.md`), 'utf-8')
  return Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    content,
  )
}
