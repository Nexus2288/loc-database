/* ============================================================
   LOVE OVER COFFEE
   CUSTOMER MENU — CART + ORDER + COUPON
   ============================================================ */

const APP = {
  apiUrl:
    'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE',

  currency: '₹',

  customerOrderHours: 2,

  storageKeys: {
    table: 'loc_table_session',
    customer: 'loc_customer_session',
    cart: 'loc_cart_session',
    order: 'loc_active_order'
  }
};


/* ============================================================
   STATE
   ============================================================ */

const state = {
  table: null,

  menu: [],

  categories: [],

  filteredMenu: [],

  cart: [],

  customer: {
    customerKey: '',
    name: '',
    mobile: ''
  },

  coupon: {
    code: '',
    valid: false,
    discountPercent: 0,
    discountAmount: 0
  },

  activeOrder: null,

  loading: false,

  placingOrder: false
};


/* ============================================================
   DOM
   ============================================================ */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  Array.from(
    document.querySelectorAll(selector)
  );


/* ============================================================
   INIT
   ============================================================ */

document.addEventListener(
  'DOMContentLoaded',
  init
);

async function init() {

  bindEvents();

  restoreCustomer();

  const token = getTableTokenFromUrl();

  if (!token) {

    showFatalError(
      'Table QR is missing.',
      'Please scan the QR code placed on your cafe table.'
    );

    return;
  }

  try {

    setLoading(true);

    await loadTable(token);

    await loadMenu();

    restoreCart();

    restoreActiveOrder();

    renderAll();

    await checkServerOrder();

  } catch (error) {

    console.error(error);

    showFatalError(
      'Unable to load menu.',
      error.message ||
      'Please scan the table QR again.'
    );

  } finally {

    setLoading(false);

  }
}


/* ============================================================
   EVENTS
   ============================================================ */

function bindEvents() {

  document.addEventListener(
    'click',
    handleDocumentClick
  );


  const searchInput =
    $('#searchInput');

  if (searchInput) {

    searchInput.addEventListener(
      'input',
      function() {

        filterMenu(
          this.value
        );

      }
    );

  }


  const customerName =
    $('#customerName');

  if (customerName) {

    customerName.addEventListener(
      'input',
      function() {

        state.customer.name =
          this.value.trim();

        saveCustomer();

      }
    );

  }


  const customerMobile =
    $('#customerMobile');

  if (customerMobile) {

    customerMobile.addEventListener(
      'input',
      function() {

        this.value =
          this.value.replace(
            /\D/g,
            ''
          ).slice(0, 10);

        state.customer.mobile =
          this.value;

        saveCustomer();

      }
    );

  }


  const couponInput =
    $('#couponCode');

  if (couponInput) {

    couponInput.addEventListener(
      'input',
      function() {

        this.value =
          this.value
            .toUpperCase()
            .replace(/\s/g, '');

      }
    );

  }


  const specialRequest =
    $('#specialRequest');

  if (specialRequest) {

    specialRequest.addEventListener(
      'input',
      function() {

        if (this.value.length > 500) {

          this.value =
            this.value.substring(
              0,
              500
            );

        }

      }
    );

  }
}


/* ============================================================
   CLICK HANDLER
   ============================================================ */

function handleDocumentClick(event) {

  const addButton =
    event.target.closest(
      '[data-add-item]'
    );

  if (addButton) {

    changeCartQuantity(
      addButton.dataset.addItem,
      1
    );

    return;
  }


  const minusButton =
    event.target.closest(
      '[data-minus-item]'
    );

  if (minusButton) {

    changeCartQuantity(
      minusButton.dataset.minusItem,
      -1
    );

    return;
  }


  const plusButton =
    event.target.closest(
      '[data-plus-item]'
    );

  if (plusButton) {

    changeCartQuantity(
      plusButton.dataset.plusItem,
      1
    );

    return;
  }


  const categoryButton =
    event.target.closest(
      '[data-category]'
    );

  if (categoryButton) {

    filterByCategory(
      categoryButton.dataset.category
    );

    return;
  }


  const openCart =
    event.target.closest(
      '[data-open-cart]'
    );

  if (openCart) {

    openCartModal();

    return;
  }


  const closeModal =
    event.target.closest(
      '[data-close-modal]'
    );

  if (closeModal) {

    closeModalByElement(
      closeModal.closest(
        '.modal'
      )
    );

    return;
  }


  const editOrder =
    event.target.closest(
      '[data-edit-order]'
    );

  if (editOrder) {

    closeAllModals();

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    return;
  }


  const applyCoupon =
    event.target.closest(
      '[data-apply-coupon]'
    );

  if (applyCoupon) {

    applyCoupon();

    return;
  }


  const removeCoupon =
    event.target.closest(
      '[data-remove-coupon]'
    );

  if (removeCoupon) {

    removeCoupon();

    return;
  }


  const placeOrder =
    event.target.closest(
      '[data-place-order]'
    );

  if (placeOrder) {

    placeOrder();

    return;
  }


  const trackOrder =
    event.target.closest(
      '[data-track-order]'
    );

  if (trackOrder) {

    openOrderModal();

    return;
  }

}


/* ============================================================
   API
   ============================================================ */

async function apiGet(
  action,
  params = {}
) {

  const url =
    new URL(APP.apiUrl);

  url.searchParams.set(
    'action',
    action
  );

  Object.keys(params).forEach(
    function(key) {

      if (
        params[key] !== undefined &&
        params[key] !== null
      ) {

        url.searchParams.set(
          key,
          params[key]
        );

      }

    }
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: 'GET',
        cache: 'no-store'
      }
    );

  if (!response.ok) {

    throw new Error(
      'Server request failed.'
    );

  }

  const data =
    await response.json();

  if (!data.ok) {

    throw new Error(
      data.message ||
      'Request failed.'
    );

  }

  return data;
}


async function apiPost(
  action,
  payload = {}
) {

  const response =
    await fetch(
      APP.apiUrl,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'text/plain;charset=utf-8'
        },

        body: JSON.stringify({
          action: action,
          ...payload
        })
      }
    );

  if (!response.ok) {

    throw new Error(
      'Server request failed.'
    );

  }

  const data =
    await response.json();

  if (!data.ok) {

    throw new Error(
      data.message ||
      'Request failed.'
    );

  }

  return data;
}


/* ============================================================
   TABLE
   ============================================================ */

function getTableTokenFromUrl() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get('t') ||
    ''
  ).trim();

}


async function loadTable(token) {

  const result =
    await apiGet(
      'validateTable',
      {
        token: token
      }
    );

  if (
    !result.data ||
    !result.data.table
  ) {

    throw new Error(
      'Invalid table QR.'
    );

  }

  state.table =
    result.data.table;

  saveTableSession();

  renderTableInfo();
}


/* ============================================================
   MENU
   ============================================================ */

async function loadMenu() {

  const result =
    await apiGet(
      'menu',
      {
        token:
          state.table.token
      }
    );

  state.menu =
    result.data.menu ||
    [];

  state.categories =
    result.data.categories ||
    [];

  state.filteredMenu =
    [...state.menu];

}


function filterMenu(searchText) {

  const query =
    String(searchText || '')
      .trim()
      .toLowerCase();

  if (!query) {

    state.filteredMenu =
      [...state.menu];

  } else {

    state.filteredMenu =
      state.menu.filter(
        function(item) {

          return (
            String(
              item.name || ''
            )
              .toLowerCase()
              .includes(query)
            ||

            String(
              item.category || ''
            )
              .toLowerCase()
              .includes(query)
            ||

            String(
              item.tag || ''
            )
              .toLowerCase()
              .includes(query)
            ||

            String(
              item.tagline || ''
            )
              .toLowerCase()
              .includes(query)
          );

        }
      );

  }

  renderMenu();
}


function filterByCategory(category) {

  const normalized =
    String(
      category || ''
    ).toLowerCase();

  if (
    normalized === 'all'
  ) {

    state.filteredMenu =
      [...state.menu];

  } else {

    state.filteredMenu =
      state.menu.filter(
        function(item) {

          return (
            String(
              item.category || ''
            ).toLowerCase() ===
            normalized
          );

        }
      );

  }

  renderCategories(
    category
  );

  renderMenu();
}


/* ============================================================
   CART
   ============================================================ */

function restoreCart() {

  const session =
    readStorage(
      APP.storageKeys.cart
    );

  if (!session) {
    state.cart = [];
    return;
  }


  /*
   * Cart is scoped to table token.
   */
  if (
    session.tableToken !==
    state.table.token
  ) {

    state.cart = [];

    removeStorage(
      APP.storageKeys.cart
    );

    return;
  }


  state.cart =
    Array.isArray(
      session.items
    )
      ? session.items
      : [];

  /*
   * Re-sync cart with current menu.
   */
  state.cart =
    state.cart
      .map(function(cartItem) {

        const menuItem =
          state.menu.find(
            function(item) {

              return (
                item.id ===
                cartItem.id
              );

            }
          );

        if (!menuItem) {
          return null;
        }

        return {
          id: menuItem.id,
          name: menuItem.name,
          price: Number(
            menuItem.price
          ),
          category:
            menuItem.category,
          quantity:
            Math.max(
              1,
              Number(
                cartItem.quantity
              ) || 1
            ),
          available:
            menuItem.available
        };

      })
      .filter(Boolean);

  saveCart();

}


function saveCart() {

  writeStorage(
    APP.storageKeys.cart,
    {
      tableToken:
        state.table
          ? state.table.token
          : '',
      items:
        state.cart
    }
  );

}


function getCartQuantity(itemId) {

  const item =
    state.cart.find(
      function(cartItem) {

        return (
          cartItem.id ===
          itemId
        );

      }
    );

  return item
    ? Number(item.quantity)
    : 0;
}


function changeCartQuantity(
  itemId,
  change
) {

  const menuItem =
    state.menu.find(
      function(item) {

        return (
          item.id ===
          itemId
        );

      }
    );

  if (!menuItem) {
    return;
  }


  if (!menuItem.available) {

    showToast(
      'This item is currently unavailable.'
    );

    return;
  }


  let cartItem =
    state.cart.find(
      function(item) {

        return (
          item.id ===
          itemId
        );

      }
    );


  if (!cartItem) {

    if (change <= 0) {
      return;
    }

    cartItem = {
      id: menuItem.id,
      name: menuItem.name,
      price:
        Number(menuItem.price),
      category:
        menuItem.category,
      quantity: 0,
      available:
        menuItem.available
    };

    state.cart.push(
      cartItem
    );

  }


  cartItem.quantity +=
    Number(change);


  if (
    cartItem.quantity <= 0
  ) {

    state.cart =
      state.cart.filter(
        function(item) {

          return (
            item.id !==
            itemId
          );

        }
      );

  }


  saveCart();

  /*
   * Coupon may become invalid when
   * subtotal changes.
   */
  resetCoupon();

  renderAll();

}


function getCartSubtotal() {

  return roundMoney(
    state.cart.reduce(
      function(total, item) {

        return (
          total +
          Number(item.price) *
          Number(item.quantity)
        );

      },
      0
    )
  );

}


function getCartCount() {

  return state.cart.reduce(
    function(total, item) {

      return (
        total +
        Number(item.quantity)
      );

    },
    0
  );

}


function resetCoupon() {

  state.coupon = {
    code: '',
    valid: false,
    discountPercent: 0,
    discountAmount: 0
  };

}


/* ============================================================
   COUPON
   ============================================================ */

async function applyCoupon() {

  const input =
    $('#couponCode');

  if (!input) {
    return;
  }

  const code =
    input.value
      .trim()
      .toUpperCase();

  if (!code) {

    showToast(
      'Enter a coupon code.'
    );

    return;
  }


  const subtotal =
    getCartSubtotal();

  if (subtotal <= 0) {

    showToast(
      'Add items before applying a coupon.'
    );

    return;
  }


  const button =
    $('[data-apply-coupon]');

  setButtonLoading(
    button,
    true,
    'Checking...'
  );


  try {

    const result =
      await apiPost(
        'previewCoupon',
        {
          code: code,
          subtotal: subtotal
        }
      );


    const coupon =
      result.data.coupon;


    state.coupon = {
      code:
        coupon.code,
      valid: true,
      discountPercent:
        Number(
          coupon.discountPercent
        ),
      discountAmount:
        Number(
          coupon.discountAmount
        )
    };


    renderCart();

    showToast(
      coupon.code +
      ' applied successfully.'
    );


  } catch (error) {

    resetCoupon();

    renderCart();

    showToast(
      error.message
    );

  } finally {

    setButtonLoading(
      button,
      false
    );

  }
}


function removeCoupon() {

  resetCoupon();

  const input =
    $('#couponCode');

  if (input) {
    input.value = '';
  }

  renderCart();

  showToast(
    'Coupon removed.'
  );

}


/* ============================================================
   PLACE ORDER
   ============================================================ */

async function placeOrder() {

  if (state.placingOrder) {
    return;
  }


  if (!state.table) {

    showToast(
      'Table information is missing.'
    );

    return;
  }


  if (!state.cart.length) {

    showToast(
      'Your cart is empty.'
    );

    return;
  }


  const nameInput =
    $('#customerName');

  const mobileInput =
    $('#customerMobile');

  const requestInput =
    $('#specialRequest');


  const name =
    (
      nameInput
        ? nameInput.value
        : state.customer.name
    ).trim();


  const mobile =
    (
      mobileInput
        ? mobileInput.value
        : state.customer.mobile
    )
      .replace(
        /\D/g,
        ''
      )
      .slice(0, 10);


  const specialRequest =
    (
      requestInput
        ? requestInput.value
        : ''
    ).trim();


  if (name.length < 2) {

    showToast(
      'Please enter your name.'
    );

    nameInput?.focus();

    return;
  }


  if (
    !/^[0-9]{10}$/.test(
      mobile
    )
  ) {

    showToast(
      'Please enter a valid 10-digit mobile number.'
    );

    mobileInput?.focus();

    return;
  }


  state.customer.name =
    name;

  state.customer.mobile =
    mobile;

  saveCustomer();


  /*
   * Final frontend total is only for display.
   * Backend calculates everything again.
   */
  const subtotal =
    getCartSubtotal();

  const button =
    $('[data-place-order]');


  state.placingOrder =
    true;

  setButtonLoading(
    button,
    true,
    'Placing order...'
  );


  try {

    const result =
      await apiPost(
        'createOrder',
        {
          tableToken:
            state.table.token,

          customerKey:
            state.customer
              .customerKey,

          customerName:
            name,

          mobileNumber:
            mobile,

          specialRequest:
            specialRequest,

          items:
            state.cart.map(
              function(item) {

                return {
                  itemId:
                    item.id,

                  quantity:
                    Number(
                      item.quantity
                    )
                };

              }
            ),

          /*
           * Backend uses this only as
           * requested coupon code.
           * Discount is calculated server-side.
           */
          couponCode:
            state.coupon.valid
              ? state.coupon.code
              : ''
        }
      );


    const order =
      result.data.order;


    if (!order) {

      throw new Error(
        'Order was not created.'
      );

    }


    /*
     * Save server-issued customer key.
     */
    state.customer.customerKey =
      order.customerKey;

    saveCustomer();


    /*
     * Save active order scoped
     * to the current table token.
     */
    state.activeOrder =
      order;

    saveActiveOrder();


    /*
     * Clear cart only AFTER
     * backend confirms order creation.
     */
    state.cart = [];

    resetCoupon();

    removeStorage(
      APP.storageKeys.cart
    );


    closeAllModals();

    renderAll();

    openOrderModal();

    showToast(
      'Order placed successfully.'
    );


  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      'Unable to place order.'
    );

  } finally {

    state.placingOrder =
      false;

    setButtonLoading(
      button,
      false
    );

  }
}


/* ============================================================
   ACTIVE ORDER
   ============================================================ */

function restoreActiveOrder() {

  const saved =
    readStorage(
      APP.storageKeys.order
    );

  if (!saved) {
    return;
  }


  /*
   * Never restore an order
   * from another table.
   */
  if (
    !state.table ||
    saved.tableToken !==
    state.table.token
  ) {

    removeStorage(
      APP.storageKeys.order
    );

    state.activeOrder =
      null;

    return;
  }


  if (
    saved.createdAt &&
    !isWithinOrderWindow(
      saved.createdAt
    )
  ) {

    removeStorage(
      APP.storageKeys.order
    );

    state.activeOrder =
      null;

    return;
  }


  state.activeOrder =
    saved.order || null;

}


function saveActiveOrder() {

  if (!state.activeOrder) {
    return;
  }

  writeStorage(
    APP.storageKeys.order,
    {
      tableToken:
        state.table.token,

      order:
        state.activeOrder
    }
  );

}


async function checkServerOrder() {

  if (
    !state.customer.customerKey ||
    !state.table
  ) {

    return;
  }


  try {

    const result =
      await apiGet(
        'order',
        {
          customerKey:
            state.customer
              .customerKey,

          tableToken:
            state.table.token
        }
      );


    if (
      result.data &&
      result.data.order
    ) {

      state.activeOrder =
        result.data.order;

      saveActiveOrder();

      renderOrderStatus();

    }

  } catch (error) {

    console.warn(
      'Order lookup failed:',
      error
    );

  }
}


function isWithinOrderWindow(
  createdAt
) {

  try {

    const created =
      new Date(
        createdAt
      ).getTime();

    const now =
      Date.now();

    const difference =
      now - created;

    return (
      difference >= 0 &&
      difference <=
      APP.customerOrderHours *
      60 *
      60 *
      1000
    );

  } catch (error) {

    return true;

  }
}


/* ============================================================
   CUSTOMER
   ============================================================ */

function restoreCustomer() {

  const customer =
    readStorage(
      APP.storageKeys.customer
    );

  if (!customer) {
    return;
  }

  state.customer = {
    customerKey:
      customer.customerKey || '',

    name:
      customer.name || '',

    mobile:
      customer.mobile || ''
  };

}


function saveCustomer() {

  writeStorage(
    APP.storageKeys.customer,
    state.customer
  );

}


/* ============================================================
   RENDER
   ============================================================ */

function renderAll() {

  renderTableInfo();

  renderCategories();

  renderMenu();

  renderCart();

  renderCustomerFields();

  renderOrderStatus();

}


function renderTableInfo() {

  const tableNumber =
    state.table
      ? state.table.tableNumber
      : '—';


  const elements = [
    $('#tableNumber'),
    $('#tableNo'),
    $('[data-table-number]')
  ];


  elements.forEach(
    function(element) {

      if (element) {

        element.textContent =
          'Table ' +
          tableNumber;

      }

    }
  );

}


function renderCategories(
  activeCategory = 'all'
) {

  const container =
    $('#categoryList');

  if (!container) {
    return;
  }


  const categories = [
    'All',
    ...state.categories
  ];


  container.innerHTML =
    categories.map(
      function(category) {

        const value =
          String(
            category
          ).toLowerCase();

        const active =
          value ===
          String(
            activeCategory
          ).toLowerCase();

        return `
          <button
            type="button"
            class="category-chip ${
              active
                ? 'active'
                : ''
            }"
            data-category="${escapeAttr(
              value
            )}"
          >
            ${escapeHtml(
              category
            )}
          </button>
        `;

      }
    ).join('');

}


function renderMenu() {

  const container =
    $('#menuGrid');

  if (!container) {
    return;
  }


  if (
    !state.filteredMenu.length
  ) {

    container.innerHTML = `
      <div class="empty-menu">
        <div class="empty-menu-icon">⌕</div>
        <h3>No items found</h3>
        <p>Try another search or category.</p>
      </div>
    `;

    return;
  }


  container.innerHTML =
    state.filteredMenu.map(
      function(item) {

        const quantity =
          getCartQuantity(
            item.id
          );

        const unavailable =
          !item.available;


        return `
          <article
            class="menu-card ${
              unavailable
                ? 'is-unavailable'
                : ''
            }"
          >

            <div class="menu-card-top">

              <div class="menu-card-copy">

                <div class="item-heading">

                  <h3>
                    ${escapeHtml(
                      item.name
                    )}
                  </h3>

                  ${
                    item.tag
                      ? `
                        <span class="item-tag">
                          ${escapeHtml(
                            item.tag
                          )}
                        </span>
                      `
                      : ''
                  }

                </div>

                ${
                  item.tagline
                    ? `
                      <p class="item-tagline">
                        ${escapeHtml(
                          item.tagline
                        )}
                      </p>
                    `
                    : ''
                }

                <div class="item-meta">

                  <span class="item-price">
                    ${APP.currency}${formatMoney(
                      item.price
                    )}
                  </span>

                  <span class="veg-badge ${
                    String(
                      item.vegStatus || ''
                    ).toLowerCase()
                  }">
                    ${getVegLabel(
                      item.vegStatus
                    )}
                  </span>

                </div>

              </div>

              <div class="quantity-control">

                ${
                  quantity > 0
                    ? `
                      <button
                        type="button"
                        class="qty-btn"
                        data-minus-item="${
                          escapeAttr(
                            item.id
                          )
                        }"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>

                      <span class="qty-value">
                        ${quantity}
                      </span>

                      <button
                        type="button"
                        class="qty-btn"
                        data-plus-item="${
                          escapeAttr(
                            item.id
                          )
                        }"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        class="add-btn"
                        data-add-item="${
                          escapeAttr(
                            item.id
                          )
                        }"
                        ${
                          unavailable
                            ? 'disabled'
                            : ''
                        }
                      >
                        ${
                          unavailable
                            ? 'Unavailable'
                            : 'Add'
                        }
                      </button>
                    `
                }

              </div>

            </div>

            ${
              unavailable
                ? `
                  <div class="stock-badge">
                    Out of Stock
                  </div>
                `
                : ''
            }

          </article>
        `;

      }
    ).join('');

}


function renderCart() {

  const count =
    getCartCount();

  const subtotal =
    getCartSubtotal();

  const discount =
    state.coupon.valid
      ? Number(
          state.coupon.discountAmount
        )
      : 0;

  const finalTotal =
    roundMoney(
      subtotal -
      discount
    );


  const countElements =
    $$('[data-cart-count]');

  countElements.forEach(
    function(element) {

      element.textContent =
        count;

    }
  );


  const totalElements =
    $$('[data-cart-total]');

  totalElements.forEach(
    function(element) {

      element.textContent =
        APP.currency +
        formatMoney(
          finalTotal
        );

    }
  );


  const subtotalElements =
    $$('[data-cart-subtotal]');

  subtotalElements.forEach(
    function(element) {

      element.textContent =
        APP.currency +
        formatMoney(
          subtotal
        );

    }
  );


  const cartItems =
    $('#cartItems');

  if (!cartItems) {
    return;
  }


  if (!state.cart.length) {

    cartItems.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add something delicious from the menu.</p>
      </div>
    `;

  } else {

    cartItems.innerHTML =
      state.cart.map(
        function(item) {

          const lineTotal =
            Number(item.price) *
            Number(item.quantity);

          return `
            <div class="cart-item">

              <div class="cart-item-info">

                <h4>
                  ${escapeHtml(
                    item.name
                  )}
                </h4>

                <span>
                  ${APP.currency}${formatMoney(
                    item.price
                  )} each
                </span>

              </div>

              <div class="cart-item-right">

                <div class="quantity-control">

                  <button
                    type="button"
                    class="qty-btn"
                    data-minus-item="${
                      escapeAttr(
                        item.id
                      )
                    }"
                  >
                    −
                  </button>

                  <span class="qty-value">
                    ${item.quantity}
                  </span>

                  <button
                    type="button"
                    class="qty-btn"
                    data-plus-item="${
                      escapeAttr(
                        item.id
                      )
                    }"
                  >
                    +
                  </button>

                </div>

                <strong>
                  ${APP.currency}${formatMoney(
                    lineTotal
                  )}
                </strong>

              </div>

            </div>
          `;

        }
      ).join('');

  }


  const discountRow =
    $('#couponDiscountRow');

  const discountValue =
    $('#couponDiscount');


  if (discountRow) {

    discountRow.style.display =
      discount > 0
        ? ''
        : 'none';

  }


  if (discountValue) {

    discountValue.textContent =
      '-' +
      APP.currency +
      formatMoney(
        discount
      );

  }


  const finalElements =
    $$('[data-final-total]');

  finalElements.forEach(
    function(element) {

      element.textContent =
        APP.currency +
        formatMoney(
          finalTotal
        );

    }
  );


  const appliedCoupon =
    $('#appliedCoupon');

  if (appliedCoupon) {

    appliedCoupon.innerHTML =
      state.coupon.valid
        ? `
          <div class="applied-coupon">
            <span>
              ${escapeHtml(
                state.coupon.code
              )}
              ·
              ${
                state.coupon.discountPercent
              }% OFF
            </span>

            <button
              type="button"
              data-remove-coupon
            >
              Remove
            </button>
          </div>
        `
        : '';

  }

}


function renderCustomerFields() {

  const name =
    $('#customerName');

  const mobile =
    $('#customerMobile');


  if (
    name &&
    !name.value
  ) {

    name.value =
      state.customer.name ||
      '';

  }


  if (
    mobile &&
    !mobile.value
  ) {

    mobile.value =
      state.customer.mobile ||
      '';

  }

}


/* ============================================================
   ORDER STATUS
   ============================================================ */

function renderOrderStatus() {

  const container =
    $('#orderStatus');

  if (!container) {
    return;
  }


  if (!state.activeOrder) {

    container.innerHTML =
      '';

    return;

  }


  const order =
    state.activeOrder;


  const status =
    String(
      order.status || 'NEW'
    ).toUpperCase();


  let title =
    'Order received';

  let description =
    'Your order has been sent to the cafe.';


  if (
    status === 'PREPARING'
  ) {

    title =
      'Your order is being prepared';

    description =
      'The kitchen has started preparing your order.';

  }


  if (
    status === 'COMPLETED'
  ) {

    title =
      'Order completed';

    description =
      'Your order has been marked completed.';

  }


  if (
    status === 'CANCELLED'
  ) {

    title =
      'Order cancelled';

    description =
      'Please contact the cafe team.';

  }


  container.innerHTML = `
    <div class="order-status-card status-${status.toLowerCase()}">

      <div class="order-status-top">

        <div>
          <span class="order-status-label">
            ORDER ${escapeHtml(
              order.orderId
            )}
          </span>

          <h3>
            ${title}
          </h3>

          <p>
            ${description}
          </p>
        </div>

        <span class="status-pill">
          ${statusLabel(
            status
          )}
        </span>

      </div>

      <div class="order-status-meta">

        <span>
          Table ${
            escapeHtml(
              order.tableNumber || ''
            )
          }
        </span>

        <strong>
          ${APP.currency}${formatMoney(
            order.finalTotal
          )}
        </strong>

      </div>

      <button
        type="button"
        class="secondary-button"
        data-track-order
      >
        View Order
      </button>

    </div>
  `;

}


/* ============================================================
   MODALS
   ============================================================ */

function openCartModal() {

  const modal =
    $('#cartModal');

  if (!modal) {
    return;
  }

  renderCart();

  modal.classList.add(
    'is-open'
  );

  document.body.classList.add(
    'modal-open'
  );

}


function openOrderModal() {

  const modal =
    $('#orderModal');

  if (!modal) {
    return;
  }

  renderOrderModal();

  modal.classList.add(
    'is-open'
  );

  document.body.classList.add(
    'modal-open'
  );

}


function renderOrderModal() {

  const container =
    $('#orderModalContent');

  if (!container) {
    return;
  }


  const order =
    state.activeOrder;


  if (!order) {

    container.innerHTML = `
      <div class="empty-order">
        <h3>No active order</h3>
        <p>Your recent order will appear here.</p>
      </div>
    `;

    return;
  }


  container.innerHTML = `
    <div class="order-detail">

      <div class="order-detail-head">

        <div>
          <span class="eyebrow">
            ORDER
          </span>

          <h3>
            ${escapeHtml(
              order.orderId
            )}
          </h3>
        </div>

        <span class="status-pill">
          ${statusLabel(
            order.status
          )}
        </span>

      </div>


      <div class="order-detail-status">

        <strong>
          ${getOrderStatusTitle(
            order.status
          )}
        </strong>

        <p>
          ${getOrderStatusDescription(
            order.status
          )}
        </p>

      </div>


      <div class="order-detail-items">

        ${
          (order.items || [])
            .map(
              function(item) {

                return `
                  <div class="order-line">

                    <span>
                      ${
                        Number(
                          item.quantity
                        )
                      }
                      ×
                      ${escapeHtml(
                        item.itemName ||
                        item.name ||
                        ''
                      )}
                    </span>

                    <strong>
                      ${APP.currency}${formatMoney(
                        item.lineTotal ||
                        (
                          Number(
                            item.price
                          ) *
                          Number(
                            item.quantity
                          )
                        )
                      )}
                    </strong>

                  </div>
                `;

              }
            )
            .join('')
        }

      </div>


      <div class="order-total-summary">

        <div>
          <span>Subtotal</span>
          <strong>
            ${APP.currency}${formatMoney(
              order.subtotal
            )}
          </strong>
        </div>

        ${
          Number(
            order.discountAmount
          ) > 0
            ? `
              <div>
                <span>
                  Coupon ${
                    escapeHtml(
                      order.couponCode || ''
                    )
                  }
                </span>

                <strong>
                  -${APP.currency}${formatMoney(
                    order.discountAmount
                  )}
                </strong>
              </div>
            `
            : ''
        }

        <div class="grand-total">
          <span>Total</span>
          <strong>
            ${APP.currency}${formatMoney(
              order.finalTotal
            )}
          </strong>
        </div>

      </div>


      <button
        type="button"
        class="secondary-button full-width"
        data-edit-order
      >
        Edit / Order More
      </button>

    </div>
  `;

}


function closeModalByElement(
  modal
) {

  if (!modal) {
    return;
  }

  modal.classList.remove(
    'is-open'
  );

  if (
    !$$('.modal.is-open').length
  ) {

    document.body.classList.remove(
      'modal-open'
    );

  }

}


function closeAllModals() {

  $$('.modal.is-open')
    .forEach(
      function(modal) {

        modal.classList.remove(
          'is-open'
        );

      }
    );

  document.body.classList.remove(
    'modal-open'
  );

}


/* ============================================================
   STORAGE
   ============================================================ */

function writeStorage(
  key,
  value
) {

  try {

    localStorage.setItem(
      key,
      JSON.stringify(
        value
      )
    );

  } catch (error) {

    console.warn(
      'Storage write failed:',
      error
    );

  }

}


function readStorage(
  key
) {

  try {

    const value =
      localStorage.getItem(
        key
      );

    if (!value) {
      return null;
    }

    return JSON.parse(
      value
    );

  } catch (error) {

    return null;

  }

}


function removeStorage(
  key
) {

  try {

    localStorage.removeItem(
      key
    );

  } catch (error) {}

}


function saveTableSession() {

  if (!state.table) {
    return;
  }

  writeStorage(
    APP.storageKeys.table,
    state.table
  );

}


/* ============================================================
   UI HELPERS
   ============================================================ */

function setLoading(
  loading
) {

  state.loading =
    loading;

  document.body.classList.toggle(
    'app-loading',
    loading
  );

}


function setButtonLoading(
  button,
  loading,
  text
) {

  if (!button) {
    return;
  }


  if (loading) {

    if (
      !button.dataset.originalText
    ) {

      button.dataset.originalText =
        button.textContent;

    }

    button.disabled =
      true;

    button.textContent =
      text || 'Please wait...';

  } else {

    button.disabled =
      false;

    if (
      button.dataset.originalText
    ) {

      button.textContent =
        button.dataset.originalText;

      delete button.dataset
        .originalText;

    }

  }

}


function showToast(
  message
) {

  let toast =
    $('#toast');


  if (!toast) {

    toast =
      document.createElement(
        'div'
      );

    toast.id =
      'toast';

    toast.className =
      'toast';

    document.body.appendChild(
      toast
    );

  }


  toast.textContent =
    message;


  toast.classList.add(
    'show'
  );


  clearTimeout(
    toast._timer
  );


  toast._timer =
    setTimeout(
      function() {

        toast.classList.remove(
          'show'
        );

      },
      2800
    );

}


function showFatalError(
  title,
  message
) {

  const root =
    document.body;

  root.innerHTML = `
    <main class="fatal-error">

      <div class="fatal-error-card">

        <div class="fatal-error-icon">
          !
        </div>

        <h1>
          ${escapeHtml(
            title
          )}
        </h1>

        <p>
          ${escapeHtml(
            message
          )}
        </p>

        <button
          type="button"
          class="primary-button"
          onclick="location.reload()"
        >
          Try Again
        </button>

      </div>

    </main>
  `;

}


/* ============================================================
   FORMATTING
   ============================================================ */

function roundMoney(
  value
) {

  return Math.round(
    Number(value || 0) *
    100
  ) / 100;

}


function formatMoney(
  value
) {

  return roundMoney(
    value
  ).toLocaleString(
    'en-IN',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );

}


function statusLabel(
  status
) {

  const value =
    String(
      status || ''
    ).toUpperCase();

  const labels = {
    NEW: 'Received',
    PREPARING: 'Preparing',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  };

  return (
    labels[value] ||
    value ||
    'Received'
  );

}


function getOrderStatusTitle(
  status
) {

  const value =
    String(
      status || ''
    ).toUpperCase();

  const titles = {
    NEW: 'Order received',
    PREPARING: 'Preparing your order',
    COMPLETED: 'Order completed',
    CANCELLED: 'Order cancelled'
  };

  return (
    titles[value] ||
    'Order received'
  );

}


function getOrderStatusDescription(
  status
) {

  const value =
    String(
      status || ''
    ).toUpperCase();

  const descriptions = {
    NEW:
      'The cafe has received your order.',

    PREPARING:
      'The kitchen has started preparing your order.',

    COMPLETED:
      'Your order has been marked completed.',

    CANCELLED:
      'Please contact the cafe team for assistance.'
  };

  return (
    descriptions[value] ||
    'Your order is being processed.'
  );

}


function getVegLabel(
  value
) {

  const status =
    String(
      value || ''
    ).toLowerCase();


  if (
    status === 'veg' ||
    status === 'vegetarian'
  ) {

    return '● Veg';

  }


  if (
    status === 'non-veg' ||
    status === 'nonveg' ||
    status === 'non vegetarian'
  ) {

    return '● Non-Veg';

  }


  return '●';
}


/* ============================================================
   SECURITY / HTML ESCAPING
   ============================================================ */

function escapeHtml(
  value
) {

  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );

}


function escapeAttr(
  value
) {

  return escapeHtml(
    value
  )
    .replace(
      /`/g,
      '&#096;'
    );

}