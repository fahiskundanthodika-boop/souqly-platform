// Plan guard middleware — enforces order limits based on shop's subscription plan
const Order = require('../models/Order');

const PLAN_LIMITS = {
  free:     50,
  starter:  500,
  growth:   Infinity,
  business: Infinity,
};

async function planGuard(req, res, next) {
  try {
    const shop = req.shop;
    if (!shop) return next();

    // Suspended shops cannot place orders
    if (shop.planStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your plan has been suspended. Please renew your subscription to continue accepting orders.',
      });
    }

    const limit = PLAN_LIMITS[shop.plan] || 50;
    if (limit === Infinity) return next();

    // Count orders this calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await Order.countDocuments({
      shopId:    shop._id,
      createdAt: { $gte: startOfMonth },
    });

    if (count >= limit) {
      return res.status(403).json({
        success: false,
        message: `Monthly order limit reached (${limit} orders on ${shop.plan} plan). Please upgrade to continue.`,
        limitReached: true,
        currentPlan: shop.plan,
        ordersThisMonth: count,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = planGuard;
