# AI Provider Configuration

## Overview
The application supports multiple AI providers for flashcard generation, summarization, and Jarvis responses. It intelligently switches between providers based on configuration and availability.

## Supported Providers
- **Gemini 2.0 Flash** (Google): Fast, cost-effective, great for medical content
- **ChatGPT (GPT-4o Mini)** (OpenAI): High quality, contextual understanding

## Environment Variables

### Gemini Configuration
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### OpenAI Configuration
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### Provider Selection
```bash
# Default provider: "gemini" or "openai"
# Default: gemini
AI_PROVIDER=gemini

# Enable automatic fallback to other provider if primary fails
# Default: true
AI_FALLBACK_ENABLED=true
```

## Setup Instructions

### Option 1: Using Gemini (Recommended for cost)
1. Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Set in `.env`:
   ```
   GEMINI_API_KEY=your_key_here
   AI_PROVIDER=gemini
   ```

### Option 2: Using OpenAI (Recommended for quality)
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Set in `.env`:
   ```
   OPENAI_API_KEY=your_key_here
   AI_PROVIDER=openai
   ```

### Option 3: Using Both (Recommended for reliability)
1. Set both API keys in `.env`:
   ```
   GEMINI_API_KEY=your_gemini_key
   OPENAI_API_KEY=your_openai_key
   AI_PROVIDER=gemini
   AI_FALLBACK_ENABLED=true
   ```
2. System will use Gemini by default and fallback to OpenAI if it fails

## Pricing Comparison

### Gemini 2.0 Flash
- Input: $0.075 / 1M tokens
- Output: $0.30 / 1M tokens
- Suitable for: High-volume flashcard generation
- Quality: Good for medical content, decent variety

### GPT-4o Mini
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- Suitable for: High-quality content generation
- Quality: Excellent for nuanced medical questions

## API Endpoints

### Check AI Provider Status
```
GET /api/study-tools/ai-status
```

Response:
```json
{
  "available": true,
  "providers": {
    "gemini": true,
    "openai": false
  },
  "current": "gemini",
  "fallbackEnabled": true
}
```

## Flashcard Generation Quality

Both providers are configured with enhanced prompts that:
- Generate specific, testable medical questions
- Avoid generic definitions
- Include clinical examples and diagnostic criteria
- Follow MedSimple's high-quality standard
- Match Portuguese Brazilian medical terminology

### Prompt Features
- Specific clinical criteria (e.g., qSOFA scores, lab values)
- Differential diagnosis questions
- When/Why/How format
- Evidence-based responses
- Practical application focus

## Troubleshooting

### All AI providers failing
1. Check API keys in `.env`
2. Verify API quotas/billing in provider dashboards
3. Enable fallback to local template generation (happens automatically)

### Slow generations
1. Gemini is typically faster (2-3 seconds)
2. OpenAI may take 4-5 seconds depending on load
3. Check network connection

### Low quality flashcards
1. Provide better source text for context
2. Use specific medical topics instead of vague themes
3. Consider using OpenAI for higher quality
4. Report issues for prompt refinement

## Local Fallback

If no AI provider is available, the system automatically falls back to:
- Template-based flashcard generation
- Local text extraction for summaries
- Static responses for Jarvis

This ensures the application remains functional even without AI services.
