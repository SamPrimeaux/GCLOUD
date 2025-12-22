/**
 * GitHub Models API Integration
 * Access AI models (GPT-4, GPT-4o, Llama, etc.) through GitHub
 *
 * API Endpoint: https://models.inference.ai.azure.com
 * Docs: https://github.com/marketplace/models
 */

// Example 1: Chat Completion (GPT-4o)
async function chatWithGPT4(message) {
  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GITHUB_MODELS_TOKEN}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for the GCLOUD monorepo SaaS platform.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// Example 2: Available Models
async function listAvailableModels() {
  const response = await fetch('https://models.inference.ai.azure.com/models', {
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_MODELS_TOKEN}`,
    }
  });

  return await response.json();
}

// Example 3: Streaming Chat Response
async function streamChatResponse(message) {
  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GITHUB_MODELS_TOKEN}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: message }],
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    console.log(chunk);
  }
}

// Example 4: Using with Cloudflare Worker
export default {
  async fetch(request, env) {
    if (request.url.includes('/api/chat')) {
      const { message } = await request.json();

      const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GITHUB_MODELS_TOKEN}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: message }]
        })
      });

      return new Response(await response.text(), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('GCLOUD AI API');
  }
};

// Available Models (as of Dec 2024):
// - gpt-4o (OpenAI GPT-4 Optimized)
// - gpt-4o-mini (Faster, cheaper GPT-4)
// - gpt-4 (OpenAI GPT-4)
// - gpt-3.5-turbo (OpenAI GPT-3.5)
// - meta-llama-3.1-405b-instruct (Meta Llama 3.1)
// - mistral-large (Mistral AI)
// - cohere-command-r-plus (Cohere)
// - ai21-jamba-instruct (AI21 Labs)

export { chatWithGPT4, listAvailableModels, streamChatResponse };
