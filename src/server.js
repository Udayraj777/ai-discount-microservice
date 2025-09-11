// File: src/server.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the protobuf
const PROTO_PATH = path.join(__dirname, '../protos/demo.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const hipstershop = grpc.loadPackageDefinition(packageDefinition).hipstershop;

// Your AI Discount Service
class AIDiscountService {
    constructor() {
        console.log('🚀 AI Discount Service Starting...');
        this.userSessions = new Map(); // Store user behavior data
    }

    // Listen to cart events (your main data source)
    async listenToCartEvents() {
        console.log('📊 Starting to listen for cart events...');
        
        // TODO: Implement gRPC client to listen to CartService calls
        // This is where you'll intercept AddItem and GetCart calls
        
        console.log('✅ Cart listener active');
    }

    // Analyze user behavior with AI
    async analyzeUserBehavior(userData) {
        console.log('🤖 Analyzing user behavior:', userData);
        
        // TODO: Implement Gemini AI analysis
        // Convert userData to JSON prompt for LLM
        
        return {
            shouldSendDiscount: true,
            discountPercentage: 15,
            reason: 'price_sensitive_user'
        };
    }

    // Send discount email
    async sendDiscountEmail(userEmail, discount) {
        console.log(`📧 Sending ${discount.discountPercentage}% discount to ${userEmail}`);
        
        // TODO: Call EmailService via gRPC
        
        console.log('✅ Discount email sent');
    }

    async start() {
        await this.listenToCartEvents();
        console.log('🎯 AI Discount Service is running!');
        
        // Keep the service alive
        setInterval(() => {
            console.log('💗 Service heartbeat - monitoring for cart abandonments...');
        }, 30000); // Every 30 seconds
    }
}

// Start the service
const aiService = new AIDiscountService();
aiService.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down AI Discount Service...');
    process.exit(0);
});

console.log('🎯 AI Discount Service initialized - ready to prevent cart abandonment!');