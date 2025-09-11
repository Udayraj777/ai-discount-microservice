# AI Discount Service

An intelligent microservice that analyzes user behavior to prevent cart abandonment by sending personalized discount offers.

## Architecture

This service intercepts gRPC calls from the Online Boutique microservices to:
- Monitor cart additions (CartService)
- Analyze browsing context (AdService) 
- Detect abandonment patterns
- Send targeted discount emails (EmailService)

## Tech Stack
- Node.js with gRPC clients
- Google Gemini AI for behavior analysis
- JSON-based data processing for LLM prompts

## Local Development
```bash
npm install
npm start