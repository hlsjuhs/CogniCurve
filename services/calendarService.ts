import { LearningItem } from '../types';

/**
 * Formats a date object to iCalendar UTC string format: YYYYMMDDTHHmmSSZ
 */
const formatDateToICS = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Generates an .ics file content from learning items and requests System to Open it.
 */
export const generateICSFile = async (items: LearningItem[]): Promise<void> => {
  // 1. Filter only items that have a future review date
  const futureItems = items.filter(
    item => item.nextReviewAt && new Date(item.nextReviewAt) > new Date()
  );

  if (futureItems.length === 0) {
    alert('当前没有待复习的未来计划。');
    return;
  }

  // 2. Group items by Date (YYYY-MM-DD)
  const groupedByDate: Record<string, LearningItem[]> = {};

  futureItems.forEach(item => {
    const dateKey = new Date(item.nextReviewAt).toDateString(); 
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(item);
  });

  // 3. Build .ics content
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CogniCurve//Scientific Memory System//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  Object.entries(groupedByDate).forEach(([dateStr, dayItems]) => {
    const targetDate = new Date(dateStr);
    const startDate = new Date(targetDate);
    startDate.setHours(9, 0, 0, 0); 
    
    const endDate = new Date(startDate);
    const durationMinutes = Math.max(15, dayItems.length * 2); 
    endDate.setMinutes(endDate.getMinutes() + durationMinutes);

    const title = `CogniCurve 复习任务 (${dayItems.length}项)`;
    const description = `今日复习内容：\\n` + dayItems.map(i => `- ${i.title}`).join('\\n');

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:cognicurve-${startDate.getTime()}@local`,
      `DTSTAMP:${formatDateToICS(new Date())}`,
      `DTSTART:${formatDateToICS(startDate)}`,
      `DTEND:${formatDateToICS(endDate)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM', 
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');
  const fileContent = icsContent.join('\r\n');

  // 4. Trigger Open
  if (window.electronAPI) {
      try {
          // Save to temp and open directly
          const savedPath = await window.electronAPI.saveFile('cognicurve_schedule.ics', fileContent);
          await window.electronAPI.openPath(savedPath);
      } catch (e) {
          console.error("Auto-open failed", e);
          alert("自动打开日历失败，尝试手动下载方式。");
          fallbackDownload(fileContent);
      }
  } else {
      fallbackDownload(fileContent);
  }
};

const fallbackDownload = (content: string) => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'cognicurve_schedule.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};