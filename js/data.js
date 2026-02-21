// ========================
// GAME DATA DEFINITIONS
// ========================

const RARITIES = {
  common:    { name:'Обычный',     color:'#9ca3af', chance:50 },
  uncommon:  { name:'Необычный',   color:'#10b981', chance:30 },
  rare:      { name:'Редкий',      color:'#a855f7', chance:13 },
  epic:      { name:'Эпический',   color:'#f59e0b', chance:5  },
  legendary: { name:'Легендарный', color:'#ff6b00', chance:1.5},
  mythic:    { name:'Мифический',  color:'#ff0080', chance:0.5},
};

const HIPPO_NAMES = [
  'Тоторо','Бронзобей','Хитрован','Мамонт','Пузырь','Косматый','Гром','Ледоруб',
  'Шаман','Вихрь','Великан','Хранитель','Гоблин','Рыцарь','Тень','Призрак',
  'Маэстро','Берсерк','Молния','Стальной','Огненный','Морозный','Ядовитый','Электрик',
  'Гигант','Малыш','Пустынник','Болотник','Горный','Речной','Аскар','Нурлан',
  'Батыр','Хаслет','Серкебай','Жарылкасын','Болат','Айдос','Мурат','Тулеген',
];

const HIPPO_EMOJIS = ['🦛','🦏','🐘','🦬','🐗','🦣','🐃','🐂'];

const MUTATIONS = [
  { id:'fire',    emoji:'🔥', name:'Огненная шкура',   desc:'+15% урона' },
  { id:'ice',     emoji:'❄️', name:'Ледяной панцирь',  desc:'+20% защиты' },
  { id:'venom',   emoji:'☠️', name:'Яд',               desc:'-10 HP/ход врагу' },
  { id:'regen',   emoji:'💚', name:'Регенерация',      desc:'+5 HP каждый ход' },
  { id:'berserk', emoji:'😤', name:'Берсерк',          desc:'+40% урон при HP<30%' },
  { id:'ghost',   emoji:'👻', name:'Призрак',          desc:'20% уклонение' },
  { id:'lucky',   emoji:'🍀', name:'Удачливый',        desc:'+15% шанс крита' },
  { id:'vampire', emoji:'🧛', name:'Вампир',           desc:'Вампиризм 20% урона' },
  { id:'giant',   emoji:'🏔️', name:'Гигант',           desc:'+50 макс. HP' },
  { id:'swift',   emoji:'⚡', name:'Молниеносный',     desc:'25% двойная атака' },
];

const CASES_DEF = [
  { id:'basic',   name:'Базовый кейс',      emoji:'📦', price:100,  currency:'coins', rarities:['common','uncommon','rare'],          desc:'Базовые бегемоты' },
  { id:'rare',    name:'Редкий кейс',        emoji:'🎁', price:300,  currency:'coins', rarities:['uncommon','rare','epic'],             desc:'Повышенный шанс редких' },
  { id:'epic',    name:'Эпический кейс',     emoji:'💜', price:100,  currency:'gems',  rarities:['rare','epic','legendary'],            desc:'Эпические и легендарные' },
  { id:'mythic',  name:'Мифический кейс',    emoji:'🌟', price:500,  currency:'gems',  rarities:['epic','legendary','mythic'],          desc:'Шанс мифического!' },
  { id:'event',   name:'Ивент кейс',         emoji:'🎉', price:200,  currency:'gems',  rarities:['rare','epic','legendary'],            desc:'Лимитированный!' },
  { id:'battle',  name:'Боевой кейс',        emoji:'⚔️', price:500,  currency:'coins', rarities:['common','uncommon','rare','epic'],    desc:'Бойцы-чемпионы' },
  { id:'mutant',  name:'Мутантский кейс',    emoji:'☢️', price:800,  currency:'coins', rarities:['uncommon','rare','epic'],             desc:'Гарантированная мутация' },
  { id:'kazakh',  name:'🇰🇿 Казахский кейс', emoji:'🦅', price:1000, currency:'coins', rarities:['rare','epic','legendary','mythic'],   desc:'Только для своих!' },
];

const WEAPONS = [
  { id:'w1', name:'Деревянная дубина', emoji:'🪵', type:'weapon', bonus:{str:3},       price:50,   rarity:'common'    },
  { id:'w2', name:'Железный меч',      emoji:'⚔️', type:'weapon', bonus:{str:8},       price:150,  rarity:'uncommon'  },
  { id:'w3', name:'Магический посох',  emoji:'🪄', type:'weapon', bonus:{int:10,str:3},price:300,  rarity:'rare'      },
  { id:'w4', name:'Клинок теней',      emoji:'🗡️', type:'weapon', bonus:{str:15,agi:5},price:600,  rarity:'epic'      },
  { id:'w5', name:'Молот Грома',       emoji:'⚡', type:'weapon', bonus:{str:25,vit:5},price:1200, rarity:'legendary' },
  { id:'w6', name:'Клыки Вальхаллы',  emoji:'🦷', type:'weapon', bonus:{str:35,lck:10},price:3000,rarity:'mythic'    },
];

const ARMORS = [
  { id:'a1', name:'Тростниковый доспех', emoji:'🌿', type:'armor', bonus:{vit:5},        price:50,   rarity:'common'    },
  { id:'a2', name:'Кожаный нагрудник',   emoji:'🥋', type:'armor', bonus:{vit:12},       price:150,  rarity:'uncommon'  },
  { id:'a3', name:'Стальная броня',      emoji:'🛡️', type:'armor', bonus:{vit:20,str:3}, price:300,  rarity:'rare'      },
  { id:'a4', name:'Чешуя дракона',       emoji:'🐉', type:'armor', bonus:{vit:30,agi:5}, price:700,  rarity:'epic'      },
  { id:'a5', name:'Мифрил',              emoji:'💙', type:'armor', bonus:{vit:45,int:8}, price:1500, rarity:'legendary' },
];

const ACCESSORIES = [
  { id:'ac1', name:'Удачливый амулет', emoji:'🍀', type:'accessory', bonus:{lck:10},       price:100, rarity:'uncommon' },
  { id:'ac2', name:'Кольцо ловкача',   emoji:'💍', type:'accessory', bonus:{agi:8},        price:150, rarity:'uncommon' },
  { id:'ac3', name:'Корона шамана',    emoji:'👑', type:'accessory', bonus:{int:12,lck:5}, price:400, rarity:'rare'     },
  { id:'ac4', name:'Перо Хумай',       emoji:'🪶', type:'accessory', bonus:{agi:15,lck:8}, price:800, rarity:'epic'     },
];

const ARTIFACTS = [
  { id:'art1', name:'Кристалл силы', emoji:'🔮', type:'artifact', bonus:{str:5,vit:5},   price:200,  rarity:'rare'      },
  { id:'art2', name:'Сердце бури',   emoji:'⛈️', type:'artifact', bonus:{str:10,agi:5},  price:500,  rarity:'epic'      },
  { id:'art3', name:'Глаз бездны',   emoji:'👁️', type:'artifact', bonus:{int:15,lck:10}, price:1000, rarity:'legendary' },
];

const ALL_ITEMS = [...WEAPONS, ...ARMORS, ...ACCESSORIES, ...ARTIFACTS];

const REGIONS = [
  { id:'savanna',    name:'Саванна',           emoji:'🌿', desc:'Лёгкие монстры',          level:1,  pvp:false, king:null, locked:false },
  { id:'swamp',      name:'Болото',             emoji:'🌊', desc:'Средняя сложность',       level:5,  pvp:false, king:null, locked:false },
  { id:'desert',     name:'Пустыня',            emoji:'🏜️', desc:'Жара, зато золото!',      level:8,  pvp:true,  king:null, locked:false },
  { id:'volcano',    name:'Вулкан',             emoji:'🌋', desc:'Огненные боссы',          level:15, pvp:true,  king:null, locked:false },
  { id:'tundra',     name:'Тундра',             emoji:'🏔️', desc:'Ледяной лут',             level:12, pvp:false, king:null, locked:false },
  { id:'jungle',     name:'Джунгли',            emoji:'🌴', desc:'Мутанты, PvP зона',       level:10, pvp:true,  king:null, locked:false },
  { id:'ruins',      name:'Древние руины',      emoji:'🏛️', desc:'Монстры + артефакты',     level:20, pvp:false, king:null, locked:true  },
  { id:'voidland',   name:'Земля Пустоты',      emoji:'🌑', desc:'Только топы. Мифический', level:30, pvp:true,  king:null, locked:true  },
  { id:'steppe',     name:'🇰🇿 Великая степь',  emoji:'🌾', desc:'Родная земля',            level:1,  pvp:true,  king:null, locked:false },
  { id:'mountains',  name:'Алтай',              emoji:'⛰️', desc:'Сокровища в пещерах',     level:7,  pvp:false, king:null, locked:false },
  { id:'sea',        name:'Каспийское море',    emoji:'🌊', desc:'Морские чудовища',        level:15, pvp:true,  king:null, locked:false },
  { id:'forest',     name:'Сибирский лес',      emoji:'🌲', desc:'Медведи vs бегемоты',     level:6,  pvp:false, king:null, locked:false },
];

const BOSSES = [
  { id:'b1', name:'Кракен',         emoji:'🦑', hp:1500,  atk:60,  def:25, xp:300,  loot:'epic',      level:5  },
  { id:'b2', name:'Огненный Феникс',emoji:'🦅', hp:2500,  atk:85,  def:40, xp:500,  loot:'legendary', level:15 },
  { id:'b3', name:'Ледяной Дракон', emoji:'🐉', hp:4000,  atk:110, def:60, xp:800,  loot:'legendary', level:25 },
  { id:'b4', name:'Тьма Вальхаллы',emoji:'💀', hp:7000,  atk:150, def:90, xp:1500, loot:'mythic',    level:40 },
  { id:'b5', name:'Отец Бегемотов', emoji:'🦛', hp:15000, atk:250, def:180,xp:5000, loot:'mythic',    level:99 },
];

const VALHALLA_BOSSES = [
  { id:'vb1', name:'Страж Врат',    emoji:'🗡️', hp:300,  atk:40, def:20 },
  { id:'vb2', name:'Демон Тени',    emoji:'👹', hp:600,  atk:70, def:35 },
  { id:'vb3', name:'Великан Тьмы',  emoji:'🏔️', hp:1000, atk:100,def:60 },
  { id:'vb4', name:'Владыка Хаоса', emoji:'🌀', hp:1500, atk:130,def:80 },
  { id:'vb5', name:'Один',          emoji:'⚡', hp:3000, atk:200,def:150},
];

const AI_PLAYERS = [
  { name:'СтальнойМамонт_kz',  elo:1200, wins:45,  losses:12 },
  { name:'БегемотМастер',       elo:980,  wins:30,  losses:25 },
  { name:'КочевникAли',         elo:1450, wins:88,  losses:20 },
  { name:'ДжунглиБой',          elo:750,  wins:15,  losses:40 },
  { name:'АрктикМедведь',       elo:1100, wins:55,  losses:30 },
  { name:'ЗлойВулкан',          elo:1600, wins:120, losses:35 },
  { name:'ЛедяноеСердце',       elo:890,  wins:22,  losses:28 },
  { name:'КурыльщикТабака',     elo:500,  wins:5,   losses:50 },
  { name:'ТигрСаванны',         elo:1300, wins:70,  losses:22 },
  { name:'НинзяСтепи',          elo:1050, wins:40,  losses:35 },
];

const DEMO_CLANS = [
  { id:'c1', name:'Степные Воины',  emoji:'🐺', power:15000, members:8,  leader:'КочевникAli', war: true  },
  { id:'c2', name:'Железная Орда',  emoji:'⚔️', power:22000, members:12, leader:'СтальнойМамонт', war: true  },
  { id:'c3', name:'Речные Духи',    emoji:'🌊', power:8000,  members:5,  leader:'БолотникSam', war: false },
  { id:'c4', name:'Огненный Степь', emoji:'🔥', power:18000, members:10, leader:'ВулканKZ', war: true  },
];
