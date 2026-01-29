import { LearningItem, CardType, Tag, DailyStats } from '../types';

const today = new Date();

export const MOCK_TAGS: Tag[] = [
  { id: '1', name: '神经科学', color: 'bg-blue-100 text-blue-800' },
  { id: '2', name: '微积分', color: 'bg-indigo-100 text-indigo-800' },
  { id: '3', name: '历史', color: 'bg-amber-100 text-amber-800' },
  { id: '4', name: '词汇', color: 'bg-emerald-100 text-emerald-800' },
];

export const MOCK_ITEMS: LearningItem[] = [
  {
    id: '1',
    type: CardType.BASIC,
    title: '海马体功能',
    contentFront: '在记忆的背景下，海马体（Hippocampus）的主要功能是什么？',
    contentBack: '海马体对新的陈述性记忆（declarative memories）的形成以及将短期记忆转化为长期记忆至关重要。它也参与空间导航功能。',
    tags: [MOCK_TAGS[0]],
    createdAt: new Date(today.getTime() - 86400000 * 5),
    lastReviewedAt: new Date(today.getTime() - 86400000 * 1),
    nextReviewAt: new Date(today.getTime()), // Due today
    retentionScore: 65,
    reviewCount: 3,
    status: 'review',
    currentInterval: 1,
    stability: 1.2
  },
  {
    id: '2',
    type: CardType.CLOZE,
    title: 'ln(x) 的导数',
    contentFront: 'd/dx [ln(x)] = {{...}}',
    contentBack: '1/x',
    tags: [MOCK_TAGS[1]],
    createdAt: new Date(today.getTime() - 86400000 * 10),
    lastReviewedAt: new Date(today.getTime() - 86400000 * 4),
    nextReviewAt: new Date(today.getTime() - 3600000), // Overdue
    retentionScore: 40,
    reviewCount: 5,
    status: 'review',
    currentInterval: 4,
    stability: 1.1
  },
  {
    id: '3',
    type: CardType.CASE,
    title: '凡尔赛条约',
    contentFront: '简述《凡尔赛条约》对德国的主要影响。',
    contentBack: '1. 领土损失。\n2. 军事限制（裁军）。\n3. 战争罪责条款（第231条）。\n4. 巨额赔款。',
    extraContext: '背景：1919年6月28日签署的和平条约，标志着第一次世界大战的结束。',
    tags: [MOCK_TAGS[2]],
    createdAt: new Date(today.getTime() - 86400000 * 2),
    lastReviewedAt: null,
    nextReviewAt: new Date(today.getTime()),
    retentionScore: 0,
    reviewCount: 0,
    status: 'new',
    currentInterval: 0,
    stability: 1.0
  },
  {
    id: '4',
    type: CardType.BASIC,
    title: 'Serendipity 定义',
    contentFront: '定义：Serendipity (意外发现)',
    contentBack: '指以快乐或有益的方式偶然发生和发展事件的现象（机缘巧合）。',
    tags: [MOCK_TAGS[3]],
    createdAt: new Date(today.getTime() - 86400000 * 20),
    lastReviewedAt: new Date(today.getTime() - 86400000 * 2),
    nextReviewAt: new Date(today.getTime() + 86400000 * 3), // Future
    retentionScore: 95,
    reviewCount: 12,
    status: 'mastered',
    currentInterval: 7,
    stability: 1.5
  }
];

export const MOCK_DAILY_STATS: DailyStats[] = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return {
    date: weekdays[d.getDay()],
    reviewsCompleted: Math.floor(Math.random() * 20) + 5,
    newCardsAdded: Math.floor(Math.random() * 5),
  };
});