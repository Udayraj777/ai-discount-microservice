// File: src/server.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// --- Configuration ---
// Get service addresses from environment variables, with defaults for local/Kubernetes testing
// In Kubernetes, these would resolve to the correct ClusterIP services.
const CART_SERVICE_ADDR = process.env.CART_SERVICE_ADDR || 'localhost:7070';
const PRODUCT_CATALOG_SERVICE_ADDR = process.env.PRODUCT_CATALOG_SERVICE_ADDR || 'localhost:3550';
const EMAIL_SERVICE_ADDR = process.env.EMAIL_SERVICE_ADDR || 'localhost:5000';
const POLLING_INTERVAL_MS = 30000; // Check for carts every 30 seconds

// --- gRPC Client Setup ---
// Load the protobuf.
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
        
        // Data Point: User Inactivity Time
        // This map stores the timestamp of the last time we saw an active cart for a user.
        // Key: user_id, Value: timestamp (in milliseconds)
        this.userLastActive = new Map();

        // --- gRPC Clients ---
        // Create the gRPC client to talk to the CartService
        this.cartClient = new hipstershop.CartService(
            CART_SERVICE_ADDR,
            grpc.credentials.createInsecure()
        );

        // Create the gRPC client to talk to the ProductCatalogService
        this.productCatalogClient = new hipstershop.ProductCatalogService(
            PRODUCT_CATALOG_SERVICE_ADDR,
            grpc.credentials.createInsecure()
        );
        
        // Create the gRPC client to talk to the EmailService
        this.emailClient = new hipstershop.EmailService(
            EMAIL_SERVICE_ADDR,
            grpc.credentials.createInsecure()
        );

        console.log(`📡 Configured to connect to CartService at ${CART_SERVICE_ADDR}`);
        console.log(`📡 Configured to connect to ProductCatalogService at ${PRODUCT_CATALOG_SERVICE_ADDR}`);
        console.log(`📡 Configured to connect to EmailService at ${EMAIL_SERVICE_ADDR}`);
    }

    // --- Helper functions to wrap gRPC callbacks in Promises for async/await ---

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

    getProductDetails(productId) {
        return new Promise((resolve, reject) => {
            this.productCatalogClient.getProduct({ id: productId }, (err, product) => {
                if (err) {
                    return reject(err);
                }
                resolve(product);
            });
        });
    }

    // Helper to convert gRPC Money object to a float
    moneyToFloat(money) {
        if (!money) return 0.0;
        return parseFloat(money.units) + (money.nanos / 1e9);
    }

    // This function now just confirms the clients are ready
    async listenToCartEvents() {
        console.log('✅ All gRPC clients are configured and ready.');
    }

    // Analyze user behavior with AI
    async analyzeUserBehavior(userData) {
        console.log('🤖 Analyzing enriched user behavior data:');
        console.log(JSON.stringify(userData, null, 2));

        // TODO: Implement Gemini AI analysis
        // Convert userData to a structured prompt for the LLM.
        // The prompt would ask the AI to act as a marketing expert and decide
        // if a discount is warranted based on the user's cart value, product categories,
        // and inactivity time.

        // Mocked response for demonstration
        return {
            shouldSendDiscount: true,
            discountPercentage: 15,
            reason: 'High cart value with significant user hesitation.'
        };
    }

    // Send discount email
    async sendDiscountEmail(userEmail, discount) {
        console.log(`📧 Preparing to send ${discount.discountPercentage}% discount to ${userEmail} because: "${discount.reason}"`);

        // TODO: Call EmailService via gRPC.
        // NOTE: The current 'demo.proto' only defines 'SendOrderConfirmation'.
        // In a real application, you would add an RPC to the EmailService proto like:
        // rpc SendDiscountOffer(SendDiscountOfferRequest) returns (Empty) {}
        // For now, we will log what we *would* send.
        
        const emailRequest = {
            email: userEmail,
            discount_code: `COMEBACK${discount.discountPercentage}`,
            discount_percentage: discount.discountPercentage,
            reason_message: "We noticed you left some items in your cart and wanted to offer a little something to help you complete your order!"
        };

        console.log('Simulating call to EmailService with request:', emailRequest);
        // this.emailClient.sendDiscountOffer(emailRequest, (err, response) => { ... });

        console.log('✅ Discount email sent (simulated).');
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

                    // If the cart is empty, there's nothing to analyze.
                    if (!cart.items || cart.items.length === 0) {
                        // If we were previously tracking this user, their cart is now empty, so we can stop.
                        if (this.userLastActive.has(userId)) {
                            this.userLastActive.delete(userId);
                        }
                        continue;
                    }

                    console.log(`🛒 Found cart with ${cart.items.length} item(s) for user ${userId}. Gathering details...`);

                    // --- 1. GATHER DATA POINT: User Inactivity Time ---
                    const now = Date.now();
                    let inactivityTimeMs = 0;
                    if (this.userLastActive.has(userId)) {
                        inactivityTimeMs = now - this.userLastActive.get(userId);
                    }
                    // Update the timestamp to the current time since we've seen an active cart.
                    this.userLastActive.set(userId, now);

                    // --- 2. GATHER DATA POINTS: Cart Contents, Total Value, Product Categories ---
                    let totalCartValue = 0;
                    const productCategories = new Set();
                    
                    // Fetch details for all products in the cart concurrently
                    const productDetailsPromises = cart.items.map(item => this.getProductDetails(item.product_id));
                    const productDetails = await Promise.all(productDetailsPromises);

                    // Process the fetched details
                    productDetails.forEach((product, index) => {
                        const item = cart.items[index];
                        const itemPrice = this.moneyToFloat(product.price_usd);
                        totalCartValue += itemPrice * item.quantity;
                        product.categories.forEach(cat => productCategories.add(cat));
                    });
                    
                    // --- 3. ASSEMBLE AI PAYLOAD ---
                    const analysisPayload = {
                        userId: userId,
                        inactivityTimeSeconds: Math.floor(inactivityTimeMs / 1000),
                        cart: {
                            items: cart.items,
                            totalValue: parseFloat(totalCartValue.toFixed(2)),
                            categories: Array.from(productCategories)
                        }
                    };
                    
                    // Analyze only if the user has been inactive for a meaningful period (e.g., > 1 minute)
                    // We check this *after* calculating, so on the first poll, inactivity is 0.
                    if (analysisPayload.inactivityTimeSeconds > 60) {
                         const analysis = await this.analyzeUserBehavior(analysisPayload);

                        if (analysis.shouldSendDiscount) {
                            const userEmail = `${userId}@example.com`; // Dummy email for example
                            await this.sendDiscountEmail(userEmail, analysis);
                        }
                    } else {
                        console.log(`User ${userId} is still active (inactivity: ${analysisPayload.inactivityTimeSeconds}s). Skipping analysis.`);
                    }

                } catch (error) {
                    console.error(`❌ Error processing user ${userId}:`, error.message);
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
