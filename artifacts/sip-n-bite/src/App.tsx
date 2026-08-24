import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowLeft,
  Banknote,
  Bell,
  ChefHat,
  Check,
  ChevronRight,
  CircleCheck,
  CircleDot,
  Clock3,
  Coffee,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu as MenuIcon,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Table2,
  TrendingUp,
  UtensilsCrossed,
  UserRound,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

type Category = 'All' | 'Breakfast' | 'Mains' | 'Little plates' | 'Coffee' | 'Cold sips';
type OrderStatus = 'received' | 'preparing' | 'ready' | 'completed';
type PaymentMethod = 'Cash' | 'UPI';

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Exclude<Category, 'All'>;
  color: string;
  accent: string;
  tag?: string;
};

type CartLine = MenuItem & { quantity: number };
type Order = {
  id: string;
  table: string;
  items: CartLine[];
  payment: PaymentMethod;
  status: OrderStatus;
  placedAt: string;
};

const menuItems: MenuItem[] = [
  { id: 'avocado-toast', name: 'Chilli avocado toast', description: 'Sourdough, lime, pickled onion, toasted seeds', price: 9.5, category: 'Breakfast', color: 'bg-[#e8d8a8]', accent: 'text-[#6c612b]', tag: 'Most loved' },
  { id: 'masala-eggs', name: 'Masala eggs on toast', description: 'Soft eggs, tomato masala, coriander, house sourdough', price: 10.75, category: 'Breakfast', color: 'bg-[#f2c76e]', accent: 'text-[#84431d]', tag: 'New today' },
  { id: 'crispy-chicken', name: 'Crispy chicken bowl', description: 'Citrus slaw, coconut rice, sesame crunch', price: 14.5, category: 'Mains', color: 'bg-[#ddaa7d]', accent: 'text-[#713719]' },
  { id: 'paneer-wrap', name: 'Smoky paneer wrap', description: 'Charred paneer, pepper relish, mint yoghurt', price: 12.25, category: 'Mains', color: 'bg-[#d4b895]', accent: 'text-[#70401f]' },
  { id: 'loaded-fries', name: 'Loaded house fries', description: 'Curry leaf salt, cheddar, spring onion dip', price: 7.25, category: 'Little plates', color: 'bg-[#f0cf72]', accent: 'text-[#755421]' },
  { id: 'corn-ribs', name: 'Lime corn ribs', description: 'Roasted corn, chilli-lime butter, herbs', price: 6.75, category: 'Little plates', color: 'bg-[#e6bd50]', accent: 'text-[#76551f]' },
  { id: 'flat-white', name: 'Flat white', description: 'Double espresso, silky steamed milk', price: 4.25, category: 'Coffee', color: 'bg-[#b9a08b]', accent: 'text-[#5c3b2a]', tag: 'House pour' },
  { id: 'filter-coffee', name: 'Filter coffee', description: 'Rotating single origin, served bright and clean', price: 3.75, category: 'Coffee', color: 'bg-[#c7a07b]', accent: 'text-[#5c3b2a]' },
  { id: 'citrus-fizz', name: 'Citrus fizz', description: 'Orange, grapefruit, basil, sparkling water', price: 5.5, category: 'Cold sips', color: 'bg-[#f2b550]', accent: 'text-[#81421e]', tag: 'Zero proof' },
  { id: 'iced-jaggery', name: 'Iced jaggery latte', description: 'Cold espresso, oat milk, jaggery, cardamom', price: 5.75, category: 'Cold sips', color: 'bg-[#cba276]', accent: 'text-[#633923]' },
];

const initialOrders: Order[] = [
  {
    id: '1042',
    table: 'T12',
    payment: 'UPI',
    status: 'preparing',
    placedAt: '12:18 PM',
    items: [
      { ...menuItems[0], quantity: 1 },
      { ...menuItems[6], quantity: 1 },
    ],
  },
  {
    id: '1041',
    table: 'T04',
    payment: 'Cash',
    status: 'received',
    placedAt: '12:16 PM',
    items: [{ ...menuItems[2], quantity: 2 }],
  },
  {
    id: '1039',
    table: 'T08',
    payment: 'UPI',
    status: 'ready',
    placedAt: '12:09 PM',
    items: [
      { ...menuItems[8], quantity: 1 },
      { ...menuItems[4], quantity: 1 },
    ],
  },
];

const money = (value: number) => `$${value.toFixed(2)}`;
const statusLabel: Record<OrderStatus, string> = {
  received: 'New order',
  preparing: 'Preparing',
  ready: 'Ready to serve',
  completed: 'Completed',
};
const statusDetail: Record<OrderStatus, string> = {
  received: 'The kitchen has your order',
  preparing: 'Your food is being made fresh',
  ready: 'Your order is ready at the pass',
  completed: 'Enjoy — thanks for stopping by',
};

type AppContextValue = {
  table: string;
  cart: CartLine[];
  orders: Order[];
  activeOrderId: string | null;
  addToCart: (item: MenuItem) => void;
  changeQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  placeOrder: (payment: PaymentMethod) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('Sip N Bite context is missing');
  return value;
}

function AppProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [activeOrderId, setActiveOrderId] = useState<string | null>('1042');
  const table = 'T12';

  useEffect(() => {
    const saved = window.localStorage.getItem('sip-n-bite-orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Order[];
        if (Array.isArray(parsed) && parsed.length) {
          setOrders(parsed);
          setActiveOrderId(parsed.find((order) => order.table === table)?.id ?? parsed[0].id);
        }
      } catch {
        window.localStorage.removeItem('sip-n-bite-orders');
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('sip-n-bite-orders', JSON.stringify(orders));
  }, [orders]);

  const addToCart = (item: MenuItem) => {
    setCart((current) => {
      const existing = current.find((line) => line.id === item.id);
      if (existing) return current.map((line) => line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { ...item, quantity: 1 }];
    });
  };

  const changeQuantity = (id: string, delta: number) => {
    setCart((current) => current.flatMap((line) => {
      if (line.id !== id) return [line];
      const quantity = line.quantity + delta;
      return quantity > 0 ? [{ ...line, quantity }] : [];
    }));
  };

  const clearCart = () => setCart([]);

  const placeOrder = (payment: PaymentMethod) => {
    const order: Order = {
      id: String(1043 + orders.filter((entry) => Number(entry.id) >= 1043).length),
      table,
      payment,
      items: cart,
      status: 'received',
      placedAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    setOrders((current) => [order, ...current]);
    setActiveOrderId(order.id);
    setCart([]);
    return order;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
  };

  const value = useMemo(() => ({ table, cart, orders, activeOrderId, addToCart, changeQuantity, clearCart, placeOrder, updateOrderStatus }), [cart, orders, activeOrderId]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function BrandMark() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--accent))] shadow-sm" aria-hidden="true">
      <Coffee size={20} strokeWidth={2.5} />
    </span>
  );
}

function Header() {
  const [location] = useLocation();
  return (
    <header className="sticky top-0 z-30 border-b border-[hsl(var(--border)/.7)] bg-[hsl(var(--background)/.92)] backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-xl" data-testid="link-home">
          <BrandMark />
          <span className="leading-none">
            <span className="block font-display text-[1.55rem] italic tracking-tight text-[hsl(var(--secondary))]">Sip N Bite</span>
            <span className="block font-mono-app text-[9px] font-bold uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">cafe & kitchen</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-[hsl(var(--accent)/.27)] px-3 py-2 text-xs font-semibold text-[hsl(var(--foreground))] sm:flex" data-testid="text-table-identity">
            <Table2 size={15} />
            Table T12 · Patio
          </div>
          <Link href="/order" className={`flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors ${location === '/order' ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`} data-testid="link-order">
            <Clock3 size={16} />
            <span className="hidden sm:inline">Your order</span>
          </Link>
          <Link href="/staff" className="flex h-10 w-10 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]" aria-label="Staff dashboard" data-testid="link-staff">
            <LayoutDashboard size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function CategoryIcon({ category }: { category: Category }) {
  if (category === 'Coffee') return <Coffee size={16} />;
  if (category === 'Little plates') return <UtensilsCrossed size={16} />;
  if (category === 'Cold sips') return <Sparkles size={16} />;
  return <ChefHat size={16} />;
}

function QuantityControl({ item, compact = false }: { item: CartLine; compact?: boolean }) {
  const { changeQuantity } = useApp();
  return (
    <div className={`flex items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] ${compact ? 'h-8' : 'h-10'}`} data-testid={`control-quantity-${item.id}`}>
      <button className="flex h-full w-9 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" onClick={() => changeQuantity(item.id, -1)} aria-label={`Remove one ${item.name}`} data-testid={`button-decrease-${item.id}`}>
        <Minus size={15} />
      </button>
      <span className="w-5 text-center text-sm font-bold" data-testid={`text-quantity-${item.id}`}>{item.quantity}</span>
      <button className="flex h-full w-9 items-center justify-center rounded-full text-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent)/.35)]" onClick={() => changeQuantity(item.id, 1)} aria-label={`Add one ${item.name}`} data-testid={`button-increase-${item.id}`}>
        <Plus size={15} />
      </button>
    </div>
  );
}

function MenuItemCard({ item, onAdd }: { item: MenuItem; onAdd: (item: MenuItem) => void }) {
  const { cart } = useApp();
  const line = cart.find((entry) => entry.id === item.id);
  return (
    <article className="pressable group flex min-h-[9.5rem] flex-col justify-between rounded-[1.35rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 warm-shadow" data-testid={`card-menu-item-${item.id}`}>
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.color} ${item.accent}`} aria-hidden="true">
            {item.category === 'Coffee' ? <Coffee size={19} /> : item.category === 'Cold sips' ? <Sparkles size={19} /> : <UtensilsCrossed size={19} />}
          </div>
          {item.tag && <span className="rounded-full bg-[hsl(var(--accent)/.35)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[hsl(var(--foreground))]">{item.tag}</span>}
        </div>
        <h3 className="font-display text-[1.3rem] leading-[1.05] text-[hsl(var(--secondary))]" data-testid={`text-item-name-${item.id}`}>{item.name}</h3>
        <p className="mt-1.5 max-w-[28ch] text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{item.description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="font-mono-app text-sm font-bold text-[hsl(var(--foreground))]" data-testid={`text-item-price-${item.id}`}>{money(item.price)}</span>
        {line ? <QuantityControl item={line} compact /> : (
          <button onClick={() => onAdd(item)} className="flex h-9 items-center gap-1.5 rounded-full bg-[hsl(var(--secondary))] px-3.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] transition-all hover:-translate-y-0.5 hover:bg-[hsl(var(--primary))]" data-testid={`button-add-${item.id}`}>
            Add <Plus size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </article>
  );
}

function CartBar({ onOpen }: { onOpen: () => void }) {
  const { cart } = useApp();
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  if (!count) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6">
      <button onClick={onOpen} className="card-shadow mx-auto flex min-h-14 w-full max-w-2xl items-center justify-between rounded-2xl bg-[hsl(var(--secondary))] px-4 text-left text-[hsl(var(--secondary-foreground))] transition-transform hover:-translate-y-1 sm:px-5" data-testid="button-open-cart">
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><ShoppingBag size={17} /></span>
          <span><strong className="block text-sm">{count} {count === 1 ? 'item' : 'items'} in your order</strong><span className="text-xs opacity-75">Tap to review</span></span>
        </span>
        <span className="flex items-center gap-1.5 font-mono-app text-sm font-bold">{money(total)} <ChevronRight size={17} /></span>
      </button>
    </div>
  );
}

function CartSheet({ onClose }: { onClose: () => void }) {
  const { cart, clearCart, placeOrder } = useApp();
  const [, setLocation] = useLocation();
  const [payment, setPayment] = useState<PaymentMethod>('UPI');
  const [placing, setPlacing] = useState(false);
  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const submitOrder = () => {
    if (!cart.length || placing) return;
    setPlacing(true);
    window.setTimeout(() => {
      placeOrder(payment);
      setPlacing(false);
      onClose();
      setLocation('/order');
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.38)] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <div className="animate-rise max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-[hsl(var(--card))] p-5 shadow-2xl sm:max-w-lg sm:rounded-[1.75rem] sm:p-6">
        <div className="mb-5 flex items-start justify-between">
          <div><p className="font-mono-app text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Table T12 · Patio</p><h2 id="cart-title" className="mt-1 font-display text-3xl text-[hsl(var(--secondary))]">Your order</h2></div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]" aria-label="Close order" data-testid="button-close-cart"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          {cart.length ? cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[hsl(var(--background))] p-3" data-testid={`row-cart-item-${item.id}`}>
              <div className="min-w-0"><h3 className="truncate text-sm font-bold">{item.name}</h3><p className="mt-0.5 font-mono-app text-xs text-[hsl(var(--muted-foreground))]">{money(item.price)} each</p></div>
              <div className="flex items-center gap-3"><QuantityControl item={item} compact /><span className="w-14 text-right font-mono-app text-xs font-bold">{money(item.price * item.quantity)}</span></div>
            </div>
          )) : <div className="rounded-2xl bg-[hsl(var(--background))] px-4 py-8 text-center" data-testid="empty-cart-state"><ShoppingBag size={22} className="mx-auto text-[hsl(var(--muted-foreground))]" /><p className="mt-2 text-sm font-semibold">Your order is empty</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Close this panel to add something tasty.</p></div>}
        </div>
        <div className="my-5 border-t border-dashed border-[hsl(var(--border))] pt-4">
          <div className="flex items-center justify-between"><span className="text-sm text-[hsl(var(--muted-foreground))]">Subtotal</span><span className="font-mono-app font-bold" data-testid="text-cart-total">{money(total)}</span></div>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Taxes and service are included. No surprises.</p>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Pay at the table</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['UPI', 'Cash'] as PaymentMethod[]).map((method) => (
              <label key={method} className={`flex cursor-pointer items-center gap-2 rounded-2xl border p-3 text-sm font-semibold transition-colors ${payment === method ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.08)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--background))]'}`} data-testid={`label-payment-${method.toLowerCase()}`}>
                <input type="radio" name="payment" value={method} checked={payment === method} onChange={() => setPayment(method)} className="accent-[hsl(var(--primary))]" data-testid={`input-payment-${method.toLowerCase()}`} />
                {method === 'UPI' ? <Smartphone size={16} /> : <Banknote size={16} />}
                {method}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 flex gap-2">
          <button onClick={clearCart} className="h-12 rounded-full px-4 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" data-testid="button-clear-cart">Clear</button>
          <button onClick={submitOrder} disabled={!cart.length || placing} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70" data-testid="button-place-order">
            {placing ? <><RefreshCw size={16} className="animate-spin" /> Sending to kitchen…</> : <>Place order <ChevronRight size={17} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const { addToCart, cart } = useApp();
  const [category, setCategory] = useState<Category>('All');
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => menuItems.filter((item) => {
    const matchesCategory = category === 'All' || item.category === category;
    const search = query.trim().toLowerCase();
    return matchesCategory && (!search || `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(search));
  }), [category, query]);

  return (
    <div className="paper-texture min-h-[100dvh]">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
        <section className="animate-rise relative overflow-hidden rounded-[2rem] bg-[hsl(var(--secondary))] px-5 py-7 text-[hsl(var(--secondary-foreground))] sm:px-10 sm:py-10">
          <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full border-[28px] border-[hsl(var(--accent)/.85)] opacity-90 sm:h-64 sm:w-64" aria-hidden="true" />
          <div className="absolute -bottom-20 right-24 h-36 w-36 rounded-full border-[18px] border-[hsl(var(--primary)/.6)]" aria-hidden="true" />
          <div className="relative max-w-xl">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> You’re at Table T12</div>
            <h1 className="font-display text-[2.7rem] leading-[.92] tracking-tight sm:text-6xl">Good food,<br /><em className="text-[hsl(var(--accent))]">no queue.</em></h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[hsl(var(--secondary-foreground)/.75)]">A little something for every kind of hungry. Pick your favourites and we’ll bring them right over.</p>
          </div>
          <div className="relative mt-7 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-[hsl(var(--secondary-foreground)/.12)] px-3 py-2">Kitchen open</span>
            <span className="rounded-full bg-[hsl(var(--secondary-foreground)/.12)] px-3 py-2">Usually 12–18 min</span>
          </div>
        </section>

        <section className="animate-rise-delay-1 mt-7" aria-label="Browse menu">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="font-mono-app text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">From our kitchen</p><h2 className="mt-1 font-display text-4xl text-[hsl(var(--secondary))]">What are you craving?</h2></div>
            <div className="relative w-full sm:w-64">
              <Search size={17} className="absolute left-3.5 top-3.5 text-[hsl(var(--muted-foreground))]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the menu" className="h-11 w-full rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-10 pr-4 text-sm shadow-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.15)]" aria-label="Search menu" data-testid="input-search-menu" />
            </div>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Menu categories">
            {(['All', 'Breakfast', 'Mains', 'Little plates', 'Coffee', 'Cold sips'] as Category[]).map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-colors ${category === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent)/.5)]'}`} role="tab" aria-selected={category === item} data-testid={`button-category-${item.toLowerCase().replace(' ', '-')}`}>
                <CategoryIcon category={item} /> {item}
              </button>
            ))}
          </div>
        </section>

        <section className="animate-rise-delay-2 mt-3" aria-live="polite">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-40 animate-pulse rounded-[1.35rem] bg-[hsl(var(--muted))]" data-testid={`skeleton-menu-${item}`} />)}
            </div>
          ) : filtered.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => <MenuItemCard key={item.id} item={item} onAdd={addToCart} />)}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] px-5 py-12 text-center" data-testid="empty-menu-results">
              <Search size={24} className="mx-auto text-[hsl(var(--muted-foreground))]" />
              <h3 className="mt-3 font-display text-2xl text-[hsl(var(--secondary))]">Nothing on that page</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Try another word or browse all of the menu.</p>
              <button onClick={() => { setQuery(''); setCategory('All'); }} className="mt-4 rounded-full bg-[hsl(var(--secondary))] px-4 py-2 text-xs font-bold text-[hsl(var(--secondary-foreground))]" data-testid="button-reset-menu">Show everything</button>
            </div>
          )}
        </section>
        <div className="mt-9 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><Bell size={14} /><span>Need a hand? Just wave to the team.</span></div>
      </main>
      {cart.length > 0 && <CartBar onOpen={() => setCartOpen(true)} />}
      {cartOpen && <CartSheet onClose={() => setCartOpen(false)} />}
    </div>
  );
}

function OrderTimeline({ order }: { order: Order }) {
  const steps: { status: OrderStatus; title: string; icon: typeof CircleDot }[] = [
    { status: 'received', title: 'Order received', icon: CircleDot },
    { status: 'preparing', title: 'Being prepared', icon: ChefHat },
    { status: 'ready', title: 'Ready to serve', icon: CircleCheck },
  ];
  const rank: Record<OrderStatus, number> = { received: 1, preparing: 2, ready: 3, completed: 4 };
  return (
    <div className="mt-8 rounded-[1.5rem] bg-[hsl(var(--secondary))] p-5 text-[hsl(var(--secondary-foreground))] sm:p-7" data-testid="panel-order-timeline">
      <div className="flex items-center justify-between"><div><p className="font-mono-app text-[10px] uppercase tracking-[.16em] text-[hsl(var(--accent))]">Order #{order.id}</p><h2 className="mt-1 font-display text-3xl">{statusLabel[order.status]}</h2></div><span className="rounded-full bg-[hsl(var(--secondary-foreground)/.12)] px-3 py-2 font-mono-app text-[10px]">{order.placedAt}</span></div>
      <p className="mt-2 text-sm text-[hsl(var(--secondary-foreground)/.72)]">{statusDetail[order.status]}</p>
      <div className="mt-8 grid grid-cols-3 gap-2">
        {steps.map(({ status, title, icon: Icon }, index) => {
          const complete = rank[order.status] >= rank[status];
          return <div key={status} className="relative" data-testid={`status-step-${status}`}>
            {index < 2 && <span className={`absolute left-[calc(50%+18px)] right-[-50%] top-4 h-px ${rank[order.status] > rank[status] ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--secondary-foreground)/.2)]'}`} />}
            <div className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full ${complete ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--secondary-foreground)/.12)] text-[hsl(var(--secondary-foreground)/.45)]'}`}><Icon size={15} /></div>
            <p className={`mt-2 text-center text-[10px] font-bold ${complete ? 'text-[hsl(var(--secondary-foreground))]' : 'text-[hsl(var(--secondary-foreground)/.45)]'}`}>{title}</p>
          </div>;
        })}
      </div>
    </div>
  );
}

function OrderPage() {
  const { orders, activeOrderId } = useApp();
  const [, setLocation] = useLocation();
  const activeOrder = orders.find((order) => order.id === activeOrderId);
  const subtotal = activeOrder?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0;
  return (
    <div className="paper-texture min-h-[100dvh]">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" data-testid="link-back-menu"><ArrowLeft size={16} /> Back to menu</Link>
        <div className="mt-7"><p className="font-mono-app text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">A little update</p><h1 className="mt-1 font-display text-5xl text-[hsl(var(--secondary))]">Track your order</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">We’ll keep this page fresh while the kitchen works.</p></div>
        {activeOrder ? (
          <>
            <OrderTimeline order={activeOrder} />
            <section className="mt-4 rounded-[1.5rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 warm-shadow" data-testid="panel-order-summary">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4"><h2 className="font-bold">At Table T12</h2><span className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{activeOrder.payment === 'UPI' ? <Smartphone size={14} /> : <Banknote size={14} />} {activeOrder.payment}</span></div>
              <div className="space-y-3 py-4">{activeOrder.items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm" data-testid={`row-order-item-${item.id}`}><span><span className="font-bold">{item.quantity} ×</span> {item.name}</span><span className="font-mono-app text-xs">{money(item.price * item.quantity)}</span></div>)}</div>
              <div className="flex justify-between border-t border-dashed border-[hsl(var(--border))] pt-4 text-sm font-bold"><span>Total paid at table</span><span className="font-mono-app" data-testid="text-order-total">{money(subtotal)}</span></div>
            </section>
          </>
        ) : (
          <div className="mt-8 rounded-[1.5rem] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-6 py-14 text-center" data-testid="empty-order-state">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/.45)] text-[hsl(var(--secondary))]"><ShoppingBag size={24} /></div>
            <h2 className="mt-4 font-display text-3xl text-[hsl(var(--secondary))]">No order yet</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-[hsl(var(--muted-foreground))]">Your table is ready when you are. The menu is just one tap away.</p>
            <button onClick={() => setLocation('/')} className="mt-5 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-browse-menu">Browse menu</button>
          </div>
        )}
      </main>
    </div>
  );
}

function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  if (status === 'received') return 'preparing';
  if (status === 'preparing') return 'ready';
  if (status === 'ready') return 'completed';
  return null;
}

function StaffOrderCard({ order }: { order: Order }) {
  const { updateOrderStatus } = useApp();
  const next = nextOrderStatus(order.status);
  const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const actionLabel = order.status === 'received' ? 'Start preparing' : order.status === 'preparing' ? 'Mark ready' : order.status === 'ready' ? 'Complete order' : 'Completed';
  return (
    <article className="rounded-[1.35rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 warm-shadow" data-testid={`card-staff-order-${order.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><span className="font-mono-app text-sm font-bold">#{order.id}</span><span className="rounded-full bg-[hsl(var(--accent)/.35)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide">Table {order.table.replace('T', '')}</span></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{order.placedAt} · {order.payment}</p></div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${order.status === 'received' ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : order.status === 'preparing' ? 'bg-[hsl(var(--accent)/.4)] text-[hsl(var(--foreground))]' : order.status === 'ready' ? 'bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`} data-testid={`status-order-${order.id}`}>{statusLabel[order.status]}</span>
      </div>
      <div className="my-4 space-y-2 border-y border-dashed border-[hsl(var(--border))] py-3">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-2 text-sm"><span><strong>{item.quantity}×</strong> {item.name}</span><span className="font-mono-app text-xs">{money(item.price * item.quantity)}</span></div>)}</div>
      <div className="flex items-center justify-between gap-3"><span className="font-mono-app text-xs font-bold">{money(total)}</span>{next ? <button onClick={() => updateOrderStatus(order.id, next)} className="flex h-9 items-center gap-1.5 rounded-full bg-[hsl(var(--secondary))] px-3.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--primary))]" data-testid={`button-advance-order-${order.id}`}>{actionLabel}<ChevronRight size={14} /></button> : <span className="flex items-center gap-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]"><Check size={14} /> {actionLabel}</span>}</div>
    </article>
  );
}

function Staff() {
  const { orders } = useApp();
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [refreshing, setRefreshing] = useState(false);
  const filtered = filter === 'all' ? orders : orders.filter((order) => order.status === filter);
  const active = orders.filter((order) => order.status !== 'completed').length;
  const revenue = orders.reduce((sum, order) => sum + order.items.reduce((total, item) => total + item.price * item.quantity, 0), 0);
  const refresh = () => { setRefreshing(true); window.setTimeout(() => setRefreshing(false), 500); };
  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))]">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1500px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-5 text-[hsl(var(--secondary-foreground))] md:flex">
          <Link href="/" className="flex items-center gap-3" data-testid="link-staff-brand"><BrandMark /><span><span className="block font-display text-2xl italic text-[hsl(var(--accent))]">Sip N Bite</span><span className="font-mono-app text-[9px] uppercase tracking-[.16em] opacity-60">staff counter</span></span></Link>
          <div className="mt-12 rounded-2xl bg-[hsl(var(--secondary-foreground)/.08)] p-4"><p className="font-mono-app text-[10px] uppercase tracking-[.15em] text-[hsl(var(--accent))]">Today’s shift</p><p className="mt-2 text-sm font-bold">Tuesday, 14 May</p><p className="mt-1 text-xs opacity-65">Lunch service · 12:00–3:00</p></div>
          <nav className="mt-8 space-y-1" aria-label="Staff navigation"><Link href="/staff" className="flex items-center gap-3 rounded-xl bg-[hsl(var(--secondary-foreground)/.12)] px-3 py-3 text-sm font-bold" data-testid="link-staff-orders"><ClipboardIcon /> Orders <span className="ml-auto rounded-full bg-[hsl(var(--accent))] px-2 py-0.5 text-[10px] text-[hsl(var(--accent-foreground))]">{active}</span></Link><Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm opacity-75 hover:bg-[hsl(var(--secondary-foreground)/.08)]" data-testid="link-staff-menu"><MenuIcon size={18} /> Customer menu</Link></nav>
          <div className="mt-auto border-t border-[hsl(var(--secondary-foreground)/.15)] pt-4"><Link href="/login" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm opacity-75 hover:bg-[hsl(var(--secondary-foreground)/.08)]" data-testid="link-staff-signout"><LogOut size={18} /> Sign out</Link></div>
        </aside>
        <main className="min-w-0 flex-1 px-4 pb-10 sm:px-7 md:px-10">
          <header className="flex min-h-[5.5rem] items-center justify-between gap-4 border-b border-[hsl(var(--border))]">
            <div><p className="font-mono-app text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Staff dashboard</p><h1 className="font-display text-4xl text-[hsl(var(--secondary))]">Good afternoon, team.</h1></div>
            <div className="flex items-center gap-2"><button onClick={refresh} className="flex h-10 items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-xs font-bold hover:bg-[hsl(var(--muted))]" data-testid="button-refresh-orders"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></button><div className="hidden h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] sm:flex" data-testid="avatar-staff"><UserRound size={18} /></div></div>
          </header>
          <div className="grid gap-3 py-6 sm:grid-cols-3">
            <div className="rounded-2xl bg-[hsl(var(--secondary))] p-4 text-[hsl(var(--secondary-foreground))]" data-testid="stat-active-orders"><div className="flex items-center justify-between"><span className="text-xs opacity-70">Open orders</span><ClipboardIcon /></div><p className="mt-3 font-mono-app text-3xl font-bold">{active}</p><p className="mt-1 text-xs text-[hsl(var(--accent))]">Needs attention</p></div>
            <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4" data-testid="stat-sales"><div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]"><span className="text-xs">Service total</span><TrendingUp size={17} /></div><p className="mt-3 font-mono-app text-3xl font-bold text-[hsl(var(--secondary))]">{money(revenue)}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Across {orders.length} tickets</p></div>
            <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4" data-testid="stat-tables"><div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]"><span className="text-xs">Tables ordering</span><Table2 size={17} /></div><p className="mt-3 font-mono-app text-3xl font-bold text-[hsl(var(--secondary))]">{new Set(orders.map((order) => order.table)).size}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Keep the room moving</p></div>
          </div>
          <section>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="font-display text-3xl text-[hsl(var(--secondary))]">Order queue</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Tap a ticket when it moves to the next station.</p></div><div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter orders">{(['all', 'received', 'preparing', 'ready', 'completed'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-bold capitalize ${filter === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`} role="tab" aria-selected={filter === item} data-testid={`button-filter-${item}`}>{item === 'all' ? 'All tickets' : statusLabel[item]}</button>)}</div></div>
            {filtered.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{filtered.map((order) => <StaffOrderCard key={order.id} order={order} />)}</div> : <div className="mt-5 rounded-[1.5rem] border border-dashed border-[hsl(var(--border))] px-5 py-14 text-center" data-testid="empty-staff-orders"><CircleCheck size={26} className="mx-auto text-[hsl(var(--secondary))]" /><h3 className="mt-3 font-display text-2xl text-[hsl(var(--secondary))]">All clear for now</h3><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">No {filter} tickets in the queue.</p></div>}
          </section>
        </main>
      </div>
    </div>
  );
}

function ClipboardIcon() {
  return <span className="flex h-[18px] w-[18px] items-center justify-center rounded border border-current"><span className="h-1 w-1 rounded-full bg-current" /></span>;
}

function Login() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<'manager' | 'counter'>('counter');
  const [email, setEmail] = useState('hello@sipnbite.cafe');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || password.length < 4) { setError('Enter your email and a 4+ character password.'); return; }
    setError('');
    setLocation('/staff');
  };
  return (
    <div className="paper-texture min-h-[100dvh] bg-[hsl(var(--secondary))]">
      <div className="mx-auto grid min-h-[100dvh] max-w-5xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_420px]">
        <div className="hidden text-[hsl(var(--secondary-foreground))] lg:block"><Link href="/" className="inline-flex items-center gap-3" data-testid="link-login-brand"><BrandMark /><span className="font-display text-3xl italic text-[hsl(var(--accent))]">Sip N Bite</span></Link><h1 className="mt-20 max-w-md font-display text-6xl leading-[.95]">The calm side of a busy counter.</h1><p className="mt-6 max-w-sm text-sm leading-relaxed opacity-70">See what needs attention, move tickets along, and keep the room feeling easy.</p><div className="mt-10 flex items-center gap-2 text-xs font-bold text-[hsl(var(--accent))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> Staff access · Sip N Bite Cafe</div></div>
        <div className="rounded-[2rem] bg-[hsl(var(--card))] p-6 shadow-2xl sm:p-8">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] lg:hidden" data-testid="link-login-back"><ArrowLeft size={16} /> Back to cafe</Link>
          <div className="lg:hidden"><BrandMark /><h1 className="mt-5 font-display text-4xl text-[hsl(var(--secondary))]">Welcome back.</h1></div>
          <div className="hidden lg:block"><p className="font-mono-app text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Team sign in</p><h2 className="mt-2 font-display text-4xl text-[hsl(var(--secondary))]">Welcome back.</h2></div>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Sign in to see the live order queue.</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div><label htmlFor="staff-email" className="mb-1.5 block text-xs font-bold">Work email</label><input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.15)]" data-testid="input-staff-email" /></div>
            <div><label htmlFor="staff-password" className="mb-1.5 block text-xs font-bold">Password</label><input id="staff-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 4 characters" className="h-12 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.15)]" data-testid="input-staff-password" /></div>
            <div><p className="mb-2 text-xs font-bold">Your role</p><div className="grid grid-cols-2 gap-2">{(['counter', 'manager'] as const).map((item) => <button type="button" key={item} onClick={() => setRole(item)} className={`rounded-xl border px-3 py-3 text-left text-xs font-bold capitalize ${role === item ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.08)] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`} data-testid={`button-role-${item}`}>{item}<span className="mt-1 block text-[10px] font-normal opacity-70">{item === 'counter' ? 'Orders & tables' : 'All cafe tools'}</span></button>)}</div></div>
            {error && <p className="rounded-xl bg-[hsl(var(--destructive)/.1)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert" data-testid="status-login-error">{error}</p>}
            <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))] hover:-translate-y-0.5" data-testid="button-staff-login"><LogIn size={16} /> Open staff view</button>
          </form>
          <p className="mt-5 text-center text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">Demo mode is active. Any valid-looking email and password will work.</p>
        </div>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Home} /><Route path="/order" component={OrderPage} /><Route path="/staff" component={Staff} /><Route path="/login" component={Login} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppProvider><Router /></AppProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;