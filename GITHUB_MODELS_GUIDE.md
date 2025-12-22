# GitHub Models Integration Guide

## 🤖 What is GitHub Models?

GitHub Models provides **free access** to AI models (GPT-4, GPT-4o, Llama, Mistral, etc.) directly through GitHub's infrastructure. Perfect for prototyping and development.

## 🔑 Your Token

Your GitHub Models token is stored in the `.env` file as `GITHUB_MODELS_TOKEN`.

✅ Already added to `.env` file
⚠️ Never commit this token to git (it's in `.gitignore`)

## 📚 Available Models (Free Tier)

| Model | Provider | Best For |
|-------|----------|----------|
| `gpt-4o` | OpenAI | General purpose, latest GPT-4 |
| `gpt-4o-mini` | OpenAI | Faster, cheaper responses |
| `gpt-4` | OpenAI | Complex reasoning |
| `meta-llama-3.1-405b-instruct` | Meta | Open source, powerful |
| `mistral-large` | Mistral AI | Multilingual, fast |
| `cohere-command-r-plus` | Cohere | RAG, tool use |

## 🚀 Quick Start

### 1. Test in Browser (cURL)

```bash
curl -X POST https://models.inference.ai.azure.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GITHUB_MODELS_TOKEN" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "Hello! Tell me about GCLOUD monorepo SaaS."
      }
    ]
  }'
```

### 2. Use in JavaScript/Node.js

```javascript
// Load environment variables
const token = process.env.GITHUB_MODELS_TOKEN;

async function chat(message) {
  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: message }]
    })
  });

  const data = await response.json();
  console.log(data.choices[0].message.content);
}

chat('What is GCLOUD?');
```

### 3. Use in Cloudflare Workers

```javascript
// In your worker (src/index.js)
export default {
  async fetch(request, env) {
    const { message } = await request.json();

    const response = await fetch(
      'https://models.inference.ai.azure.com/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GITHUB_MODELS_TOKEN}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: message }]
        })
      }
    );

    return new Response(await response.text());
  }
};
```

## 🔧 Integration with GCLOUD

### Add to Cloudflare Worker Secrets

```bash
# Using Wrangler CLI
wrangler secret put GITHUB_MODELS_TOKEN
# Paste your token when prompted
```

### Add to GitHub Secrets (for Actions)

1. Go to: https://github.com/SamPrimeaux/GCLOUD/settings/secrets/actions
2. Click "New repository secret"
3. Name: `GITHUB_MODELS_TOKEN`
4. Value: (paste your GitHub Models token from `.env` file)

## 💡 Use Cases for GCLOUD

### 1. AI-Powered Chat Boards
```javascript
// Real-time chat assistance
async function helpUser(question) {
  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_MODELS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a GCLOUD platform assistant.' },
        { role: 'user', content: question }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 2. Code Generation
```javascript
// Generate code snippets
async function generateCode(description) {
  return await chat(`Generate JavaScript code for: ${description}`);
}
```

### 3. Content Processing
```javascript
// Process and summarize documents
async function summarizeDocument(text) {
  return await chat(`Summarize this: ${text}`);
}
```

## 📊 Rate Limits (Free Tier)

- **Requests**: 15 requests per minute
- **Tokens**: Varies by model
- **Context Window**: Up to 128k tokens (model dependent)

## 🔗 Resources

- **GitHub Models Marketplace**: https://github.com/marketplace/models
- **Documentation**: https://docs.github.com/en/github-models
- **API Endpoint**: https://models.inference.ai.azure.com
- **Example Code**: See `src/github-models.js`

## 🎯 Integration Checklist

- [x] Token created
- [x] Token added to `.env`
- [x] Example code created (`src/github-models.js`)
- [ ] Add to Cloudflare Worker secrets (run: `wrangler secret put GITHUB_MODELS_TOKEN`)
- [ ] Add to GitHub repository secrets
- [ ] Test API connection
- [ ] Implement in MeauxOS chat boards

## 🛡️ Security Notes

- ✅ Token is in `.gitignore` (won't be committed)
- ✅ Use environment variables in production
- ✅ Never expose token in client-side code
- ✅ Token has no expiration (but can be revoked)

## 🔄 Next Steps

1. **Test the API** - Run the cURL command above
2. **Add to Workers** - Deploy with `wrangler secret put`
3. **Integrate into UI** - Add chat feature to MeauxOS
4. **Scale up** - Monitor usage and upgrade if needed
