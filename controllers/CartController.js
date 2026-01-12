import Cart from "../models/cartModel.js"

export const addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id;

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = new Cart({
      user: userId,
      items: [{ product: productId, quantity }]
    });
  } else {
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }
  }

  await cart.save();

  res.status(200).json({
    success: true,
    message: "Item added to cart",
    cart
  });
};


export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId })
      .populate("items.product");

    if (!cart) {
      return res.status(200).json({
        success: true,
        items: []
      });
    }

    res.status(200).json({
      success: true,
      cart
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart"
    });
  }
};
