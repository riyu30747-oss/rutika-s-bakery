// --- PASTE YOUR STRIPE PUBLISHABLE KEY HERE ---
// Note: It must be defined as a variable if you use it globally, 
// but for safety, we initialize it inside the checkout function or check for library load.
// Ideally, put this at the top:
const stripeKey = 'pk_test_51SfhuFFNJDJx2yz68ldsAakG6CjroKCGtTSepqvNcSIC6pCqGZGXFXBJZiayICaSVUtyb7BbjkYn8Xq46lSrDfge003B0MeOVB';

let cart = JSON.parse(localStorage.getItem('rutikasCart')) || [];
updateCartCountUI();

// --- MODAL LOGIC ---
const modal = document.getElementById("product-modal");
const closeModalBtn = document.getElementsByClassName("close-modal")[0];
const addToCartBtn = document.getElementById("add-to-cart-btn");
let currentProductDetails = {};

if (document.querySelectorAll('.btn-view-details')) {
    document.querySelectorAll('.btn-view-details').forEach(button => {
        button.addEventListener('click', (e) => {
            const card = e.target.closest('.product-card');
            currentProductDetails = {
                id: card.dataset.id,
                name: card.dataset.name,
                price: parseFloat(card.dataset.price),
                ingredients: card.dataset.ing,
                img: card.dataset.img,
                quantity: 1
            };
            
            // Populate Modal
            document.getElementById('modal-title').innerText = currentProductDetails.name;
            document.getElementById('modal-price').innerText = `₹${currentProductDetails.price.toFixed(2)}`;
            document.getElementById('modal-ingredients').innerText = currentProductDetails.ingredients;
            document.getElementById('modal-img').src = card.querySelector('img').src; 
            document.getElementById('quantity').value = 1;
            
            if(modal) modal.style.display = "flex";
        });
    });
}

if(closeModalBtn) {
    closeModalBtn.onclick = function() { modal.style.display = "none"; }
}
window.onclick = function(event) { if (event.target == modal) { modal.style.display = "none"; }}

const qtyInput = document.getElementById('quantity');
if(qtyInput) {
    qtyInput.addEventListener('change', (e) => {
        currentProductDetails.quantity = parseInt(e.target.value);
    });
}

// --- CART LOGIC ---
if(addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
        addToCart(currentProductDetails);
        modal.style.display = "none";
        alert(`${currentProductDetails.name} added to cart!`);
    });
}

function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += product.quantity;
    } else {
        cart.push(product);
    }
    saveCartToStorage();
    updateCartCountUI();
}

function saveCartToStorage() {
    localStorage.setItem('rutikasCart', JSON.stringify(cart));
}

function updateCartCountUI() {
    const cartCountElement = document.getElementById('cart-count');
    if(cartCountElement) {
        const totalCount = cart.reduce((total, item) => total + item.quantity, 0);
        cartCountElement.innerText = totalCount;
    }
}

// --- CHECKOUT & PAYMENT LOGIC ---

async function processCheckout() {
    const addressInput = document.getElementById('address');
    const methodInput = document.getElementById('payment-method');

    if(!addressInput || !methodInput) return; // Safety check

    const address = addressInput.value;
    const paymentMethod = methodInput.value;
    
    if(!address) { alert("Please enter delivery address"); return; }
    if(cart.length === 0) { alert("Your cart is empty!"); return; }

    // Option 1: Cash on Delivery
    if (paymentMethod === 'cod') {
        showOrderSuccess(); 
        return;
    }

    // Option 2: Online Payment (Stripe)
    if (paymentMethod === 'online') {
        const checkoutBtn = document.querySelector('.btn-primary'); // The button user clicked
        const originalText = checkoutBtn.innerText;
        checkoutBtn.innerText = "Processing...";
        checkoutBtn.disabled = true;

        // Initialize Stripe
        const stripe = Stripe(stripeKey);

        try {
            // Call Backend
            const response = await fetch('https://localhost:3000/cart.html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    cartItems: cart,
                    customerAddress: address 
                }),
            });

            const session = await response.json();

            if(session.error) {
                alert("Server Error: " + session.error);
                checkoutBtn.innerText = originalText;
                checkoutBtn.disabled = false;
                return;
            }

            // Redirect to Stripe
            const result = await stripe.redirectToCheckout({ sessionId: session.id });

            if (result.error) {
                alert(result.error.message);
                checkoutBtn.innerText = originalText;
                checkoutBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error:', error);
            alert("Payment failed. See console for details.");
            checkoutBtn.innerText = originalText;
            checkoutBtn.disabled = false;
        }
    }
}

function showOrderSuccess() {
     const overlay = document.getElementById('success-overlay');
     if(overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
     }
     cart = [];
     saveCartToStorage();
     updateCartCountUI();
}

// Check for successful payment on page load
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        showOrderSuccess();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};