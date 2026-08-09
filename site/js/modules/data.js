// data.js - Mock Data (سيتم استبدالها بـ Firebase لاحقاً)

export const mockServices = [
  {
    id: '1',
    title: 'تصميم مواقع احترافية',
    title_en: 'Professional Web Design',
    slug: 'professional-web-design',
    description: 'تصميم مواقع مخصصة باستخدام أحدث التقنيات مع تجربة مستخدم استثنائية.',
    description_en: 'Custom website design using latest technologies with exceptional UX.',
    price: 500,
    currency: 'SAR',
    image: 'assets/service-1.jpg',
    features: ['تصميم مخصص', 'استجابة كاملة', 'تحسين محركات البحث'],
    features_en: ['Custom design', 'Fully responsive', 'SEO optimized'],
    featured: true,
    active: true,
  },
  {
    id: '2',
    title: 'تطوير قوالب بلوجر',
    title_en: 'Blogger Templates Development',
    slug: 'blogger-templates',
    description: 'قوالب بلوجر احترافية عالية الأداء وسهلة التخصيص.',
    description_en: 'Professional high-performance Blogger templates easy to customize.',
    price: 250,
    currency: 'SAR',
    image: 'assets/service-2.jpg',
    features: ['كود نظيف', 'ميزات متقدمة', 'دعم فني'],
    features_en: ['Clean code', 'Advanced features', 'Technical support'],
    featured: true,
    active: true,
  },
  {
    id: '3',
    title: 'تحسين محركات البحث SEO',
    title_en: 'SEO Optimization',
    slug: 'seo-optimization',
    description: 'تحسين ظهور موقعك في محركات البحث وجلب زوار مستهدفين.',
    description_en: 'Improve your site visibility on search engines and attract targeted visitors.',
    price: 300,
    currency: 'SAR',
    image: 'assets/service-3.jpg',
    features: ['تحليل كامل', 'استراتيجية محتوى', 'بناء روابط'],
    features_en: ['Full analysis', 'Content strategy', 'Link building'],
    featured: false,
    active: true,
  }
];

export const mockTemplates = [
  {
    id: 't1',
    title: 'قالب مدون احترافي',
    title_en: 'Professional Blogger Template',
    slug: 'blogger-pro',
    type: 'blogger',
    description: 'قالب حديث لمدونات التقنية والمحتوى العربي.',
    description_en: 'Modern template for tech and Arabic content blogs.',
    price: 150,
    currency: 'SAR',
    image: 'assets/template-1.jpg',
    features: ['تصميم أنيق', 'سريع التحميل', 'متوافق مع السيو'],
    features_en: ['Elegant design', 'Fast loading', 'SEO compatible'],
    featured: true,
    active: true,
  },
  {
    id: 't2',
    title: 'قالب ووردبريس',
    title_en: 'WordPress Theme',
    slug: 'wordpress-theme',
    type: 'wordpress',
    description: 'قالب ووردبريس متعدد الاستخدامات مناسب للمتاجر والمدونات.',
    description_en: 'Multi-purpose WordPress theme suitable for stores and blogs.',
    price: 200,
    currency: 'SAR',
    image: 'assets/template-2.jpg',
    features: ['عناصر جاهزة', 'مستجيب بالكامل', 'دعم وودوكومرس'],
    features_en: ['Ready elements', 'Fully responsive', 'WooCommerce support'],
    featured: false,
    active: true,
  }
];

export const mockProducts = [
  {
    id: 'p1',
    title: 'إضافة مشاركات مميزة',
    title_en: 'Featured Posts Plugin',
    slug: 'featured-posts',
    type: 'free',
    description: 'إضافة لعرض المشاركات المميزة في واجهة موقعك.',
    description_en: 'Plugin to display featured posts on your site.',
    price: 0,
    currency: 'SAR',
    image: 'assets/product-1.jpg',
    downloadUrl: '#',
    active: true,
  },
  {
    id: 'p2',
    title: 'قالب نظام إدارة محتوى',
    title_en: 'CMS Template',
    slug: 'cms-template',
    type: 'paid',
    description: 'نظام إدارة محتوى متكامل للشركات والمؤسسات.',
    description_en: 'Complete CMS for businesses and corporations.',
    price: 400,
    currency: 'SAR',
    image: 'assets/product-2.jpg',
    active: true,
  }
];

export const mockPortfolio = [
  {
    id: 'pf1',
    title: 'موقع شركة تقنية',
    title_en: 'Tech Company Website',
    slug: 'tech-company',
    description: 'موقع شركة تقنية مع لوحة تحكم متقدمة.',
    description_en: 'Tech company website with advanced dashboard.',
    coverImage: 'assets/portfolio-1.jpg',
    technologies: ['HTML', 'CSS', 'JavaScript', 'Firebase'],
    featured: true,
    active: true,
  },
  {
    id: 'pf2',
    title: 'منصة تعليمية',
    title_en: 'Educational Platform',
    slug: 'edu-platform',
    description: 'منصة تعليمية تفاعلية مع نظام إدارة الدروس.',
    description_en: 'Interactive educational platform with lesson management.',
    coverImage: 'assets/portfolio-2.jpg',
    technologies: ['React', 'Firebase', 'Tailwind'],
    featured: true,
    active: true,
  }
];

export const mockPosts = [
  {
    id: 'b1',
    title: 'كيف تختار قالب بلوجر احترافي؟',
    title_en: 'How to Choose a Professional Blogger Template?',
    slug: 'choose-blogger-template',
    excerpt: 'دليل شامل لاختيار القالب المناسب لمحتوى مدونتك.',
    excerpt_en: 'Comprehensive guide to choose the right template for your blog content.',
    featuredImage: 'assets/blog-1.jpg',
    tags: ['بلوجر', 'قوالب'],
    status: 'published',
    featured: true,
    publishedAt: new Date('2026-07-20'),
  },
  {
    id: 'b2',
    title: 'أساسيات تحسين محركات البحث',
    title_en: 'SEO Basics',
    slug: 'seo-basics',
    excerpt: 'تعلم أساسيات السيو لتحسين ترتيب موقعك في جوجل.',
    excerpt_en: 'Learn SEO basics to improve your site ranking on Google.',
    featuredImage: 'assets/blog-2.jpg',
    tags: ['SEO', 'تسويق'],
    status: 'published',
    featured: false,
    publishedAt: new Date('2026-07-15'),
  }
];

export const mockTestimonials = [
  {
    id: 'r1',
    user: 'أحمد محمد',
    user_en: 'Ahmed Mohammed',
    rating: 5,
    comment: 'خدمة ممتازة واحترافية عالية، أنصح بالتعامل مع عبدالله.',
    comment_en: 'Excellent service and high professionalism, highly recommend.',
    avatar: 'assets/avatar-1.jpg',
    status: 'approved',
  },
  {
    id: 'r2',
    user: 'سارة علي',
    user_en: 'Sara Ali',
    rating: 5,
    comment: 'أفضل منصة خدمات رقمية تعاملت معها، نتائج مبهرة.',
    comment_en: 'The best digital services platform I have dealt with, amazing results.',
    avatar: 'assets/avatar-2.jpg',
    status: 'approved',
  }
];

export const mockFaq = [
  {
    q: 'ما هي مدة تنفيذ الخدمة؟',
    q_en: 'What is the service delivery time?',
    a: 'تختلف المدة حسب نوع الخدمة، تتراوح بين 3 إلى 10 أيام عمل.',
    a_en: 'The duration varies depending on the service type, ranging from 3 to 10 business days.',
  },
  {
    q: 'هل تقدمون ضمان على الخدمات؟',
    q_en: 'Do you provide a warranty on services?',
    a: 'نعم، نقدم ضمان لمدة 30 يومًا على جميع خدماتنا.',
    a_en: 'Yes, we provide a 30-day warranty on all our services.',
  },
  {
    q: 'كيف يمكنني التواصل مع الدعم؟',
    q_en: 'How can I contact support?',
    a: 'يمكنك التواصل عبر الواتساب أو البريد الإلكتروني الموجودين في تذييل الموقع.',
    a_en: 'You can contact via WhatsApp or email found in the site footer.',
  }
];
