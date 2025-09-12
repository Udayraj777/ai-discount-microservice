// File: src/server.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// --- Configuration ---
// Get the CartService address from environment variables, with a default for local testing
const CART_SERVICE_ADDR = process.env.CART_SERVICE_ADDR || 'localhost:7070';
const POLLING_INTERVAL_MS = 30000; // Check for carts every 30 seconds

// --- gRPC Client Setup ---
// Load the protobuf. Assuming it's the hipstershop demo proto.
// Make sure the path to your .proto file is correct.
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

        // Create the gRPC client to talk to the CartService
        this.cartClient = new hipstershop.CartService(
            CART_SERVICE_ADDR,
            grpc.credentials.createInsecure() // Use insecure credentials for this example
        );
    }

    // Helper function to wrap the gRPC callback in a Promise for async/await
    getCartForUser(userId) {
        return new Promise((resolve, reject) => {
            this.cartClient.getCart({ user_id: userId }, (err, cart) => {
                if (err) {
                    // If the cart is not found, gRPC returns an error. We treat this as an empty cart.
                    if (err.code === grpc.status.NOT_FOUND) {
                        return resolve({ user_id: userId, items: [] });
                    }
                    return reject(err);
                }
                resolve(cart);
            });
        });
    }

    // This function now just confirms the client is ready
    async listenToCartEvents() {
        console.log(`📡 Cart Service client configured to connect to ${CART_SERVICE_ADDR}`);
        // In a real application, you might add a gRPC health check here
        console.log('✅ Cart listener ready.');
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
        
        // Keep the service alive by polling for abandoned carts
        setInterval(async () => {
            console.log('💗 Service heartbeat - polling for cart abandonments...');
            
            // In a real app, you would get this list from a session service or database
            const activeUserIds = ['1', '2', '3']; // Dummy users to check

            for (const userId of activeUserIds) {
                try {
                    const cart = await this.getCartForUser(userId);

                    // Simple abandonment logic: if the cart has items, analyze it.
                    // A real app would also check the cart's last_updated timestamp.
                    if (cart.items && cart.items.length > 0) {
                        console.log(`🛒 Found cart with ${cart.items.length} item(s) for user ${userId}. Analyzing...`);

                        const analysis = await this.analyzeUserBehavior({ userId, cart });

                        if (analysis.shouldSendDiscount) {
                            const userEmail = `${userId}@example.com`; // Dummy email for example
                            await this.sendDiscountEmail(userEmail, analysis);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error checking cart for user ${userId}:`, error.message);
                }
            }
        }, POLLING_INTERVAL_MS);
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
