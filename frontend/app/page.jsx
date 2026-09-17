// Landing page - what visitors see when they go to souqly.app
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Souqly</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-600 hover:text-primary transition-colors">
            Dashboard
          </Link>
          <Link href="/login" className="btn-outline text-sm py-2 px-4">
            Login
          </Link>
          <Link href="/signup" className="btn-primary text-sm py-2 px-4">
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-8 py-24 text-center">
        <div className="inline-block bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
          🚀 White-Label Ordering Platform
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Your Store Online<br />
          <span className="text-primary">In 5 Minutes</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Give your customers a beautiful online ordering experience.
          WhatsApp notifications, GST invoices, rider tracking — everything your
          business needs to grow.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/signup" className="btn-primary text-lg px-8 py-4">
            Start for Free →
          </Link>
          <Link href="/store/demo" className="btn-outline text-lg px-8 py-4">
            See a Demo Store
          </Link>
        </div>
        <p className="text-gray-400 text-sm mt-4">No credit card needed · Free plan available</p>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need to Run Your Business
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🛍️', title: 'Online Store', desc: 'Beautiful storefront with your logo, colors, and products. Customers order from your unique link.' },
            { icon: '💬', title: 'WhatsApp Orders', desc: 'Get orders on WhatsApp and send automatic confirmations and delivery updates to customers.' },
            { icon: '🛵', title: 'Rider Management', desc: 'Assign riders to orders, track deliveries in real-time, and monitor earnings.' },
            { icon: '📊', title: 'Sales Analytics', desc: 'See today\'s sales, top products, and growth charts. Make smarter decisions.' },
            { icon: '🧾', title: 'GST Invoices', desc: 'Auto-generate professional GST invoices for every order. India-compliant.' },
            { icon: '📣', title: 'Marketing Broadcast', desc: 'Send WhatsApp promotions to all your customers with one click.' },
          ].map((f, i) => (
            <div key={i} className="card hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Simple Pricing</h2>
          <p className="text-center text-gray-500 mb-12">Start free. Upgrade when you grow.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { name: 'Free', price: '₹0', color: 'gray', features: ['1 Store', '50 Products', '100 Orders/mo'] },
              { name: 'Starter', price: '₹999', color: 'blue', features: ['500 Products', 'Unlimited Orders', 'WhatsApp Alerts'] },
              { name: 'Growth', price: '₹2,499', color: 'orange', features: ['3 Branches', 'WhatsApp Marketing', 'GST Invoices', 'Rider App'], popular: true },
              { name: 'Business', price: '₹4,999', color: 'purple', features: ['10 Branches', 'Everything+', 'API Access', 'Priority Support'] },
            ].map((plan, i) => (
              <div key={i} className={`card relative ${plan.popular ? 'border-2 border-primary shadow-lg' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                <div className="text-3xl font-bold text-primary my-2">{plan.price}<span className="text-sm text-gray-400 font-normal">/mo</span></div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block text-center btn-primary text-sm py-2">
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-white font-bold text-lg mb-2">Souqly</div>
            <p className="text-sm">White-label ordering platform for small businesses in India and GCC.</p>
            <p className="text-xs mt-3">FaizeCart Online Services OPC Pvt Ltd</p>
            <p className="text-xs">GSTIN: 32AAFCF7417G1ZU | Kochi, Kerala, India</p>
          </div>
          <div>
            <div className="text-white font-medium mb-3">Product</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/features" className="hover:text-white">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link href="/store/demo" className="hover:text-white">Demo Store</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-white font-medium mb-3">Support</div>
            <ul className="space-y-2 text-sm">
              <li>WhatsApp: +91 XXXXX XXXXX</li>
              <li>Email: support@souqly.app</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-sm">
          © 2024 Souqly by FaizeCart Online Services OPC Pvt Ltd. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
