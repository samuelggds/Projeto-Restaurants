import type { HomeData } from './types'

const images = {
  pizza: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=88',
  pepperoni: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=88',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1400&q=90',
  pasta: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=88',
  dessert: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1000&q=88',
  drink: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1000&q=88',
  delivery: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=1000&q=88',
}

export const homeMockData: HomeData = {
  brand: {
    name: 'Sabor & Casa',
    monogram: 'S&C',
    address: 'Rua das Flores, 123',
    primaryColor: '#d64d08',
    whatsapp: '5585999999999',
  },
  hero: {
    title: 'Seu momento',
    highlight: 'mais saboroso',
    description: 'Delivery rápido, comida feita com carinho',
    image: images.burger,
  },
  banners: [
    { title: 'Frete grátis', highlight: 'hoje', image: images.delivery },
    { title: 'Combo da', highlight: 'semana', description: 'Mais sabor por menos', image: images.pepperoni },
  ],
  categories: [
    { id: 'pizzas', name: 'Pizzas', image: images.pizza },
    { id: 'burgers', name: 'Hambúrgueres', image: images.burger },
    { id: 'pastas', name: 'Massas', image: images.pasta },
    { id: 'combos', name: 'Combos', image: images.burger },
    { id: 'desserts', name: 'Sobremesas', image: images.dessert },
    { id: 'drinks', name: 'Bebidas', image: images.drink },
  ],
  products: [
    { id: '1', categoryId: 'pizzas', name: 'Pizza Margherita', description: 'Molho de tomate, muçarela de búfala e manjericão.', price: 54.9, image: images.pizza, rating: 4.8 },
    { id: '2', categoryId: 'burgers', name: 'Burger da Casa', description: 'Pão brioche, blend Angus, cheddar, bacon e molho especial.', price: 42.9, image: images.burger, rating: 4.7 },
    { id: '3', categoryId: 'pastas', name: 'Penne Funghi', description: 'Penne ao creme de funghi com parmesão e salsinha.', price: 39.9, image: images.pasta, rating: 4.6 },
    { id: '4', categoryId: 'combos', name: 'Combo Família', description: '2 burgers da casa, batata grande e 2 bebidas.', price: 89.9, image: images.burger, rating: 4.9 },
  ],
  deliveryTime: '30–45 min',
  minimumOrder: 25,
  freeDeliveryFrom: 60,
  isOpen: true,
  about: 'Ingredientes selecionados, receitas preparadas com carinho e uma experiência feita para transformar cada pedido em um momento especial.',
}
