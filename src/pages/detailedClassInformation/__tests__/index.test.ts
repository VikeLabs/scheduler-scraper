import * as cheerio from 'cheerio';

import { detailedClassInfoExtractor } from '../index';
import { getScheduleFileByCourse, getSectionFileByCRN } from '../../../common/pathBuilders';

describe('Detailed Class Information', () => {
  it('should throw error when wrong page type is given', async () => {
    const $ = cheerio.load(await getScheduleFileByCourse('202009', 'CHEM', '101'));

    await expect(async () => await detailedClassInfoExtractor($)).rejects.toThrowError('wrong page type for parser');
  });

  it.skip('parses ECE260 correctly', async () => {
    const $ = cheerio.load(await getSectionFileByCRN('202009', '10953'));
    const parsed = await detailedClassInfoExtractor($);

    expect(parsed.seats.capacity).toBe(130);
    expect(parsed.seats.actual).toBe(107);
    expect(parsed.seats.remaining).toBe(23);

    expect(parsed.waitlistSeats.capacity).toBe(50);
    expect(parsed.waitlistSeats.actual).toBe(0);
    expect(parsed.waitlistSeats.remaining).toBe(50);

    expect(parsed.requirements.level).toStrictEqual(['undergraduate']);
    expect(parsed.requirements.fieldOfStudy).toStrictEqual([
      'EN: Biomedical Engineering',
      'EN: Computer Engineering',
      'EN: Electrical Engr',
      'EN: Software Engineering BSENG',
    ]);
  });

  it('parses CSC355 correctly - case with no field requirements', async () => {
    const $ = cheerio.load(await getSectionFileByCRN('202009', '10801'));
    const parsed = await detailedClassInfoExtractor($);

    expect(parsed.seats.capacity).toBe(32);
    expect(parsed.seats.actual).toBe(17);
    expect(parsed.seats.remaining).toBe(15);

    expect(parsed.waitlistSeats.capacity).toBe(10);
    expect(parsed.waitlistSeats.actual).toBe(0);
    expect(parsed.waitlistSeats.remaining).toBe(10);

    expect(parsed.requirements.level).toStrictEqual(['undergraduate']);
    expect(parsed.requirements.fieldOfStudy).toBeUndefined();
  });

  it('parses LAW309 correctly - case with law restriction and no field requirements', async () => {
    const $ = cheerio.load(await getSectionFileByCRN('202009', '13082'));
    const parsed = await detailedClassInfoExtractor($);

    expect(parsed.seats.capacity).toBe(50);
    expect(parsed.seats.actual).toBe(50);
    expect(parsed.seats.remaining).toBe(0);

    expect(parsed.waitlistSeats.capacity).toBe(100);
    expect(parsed.waitlistSeats.actual).toBe(0);
    expect(parsed.waitlistSeats.remaining).toBe(100);

    expect(parsed.requirements.level).toStrictEqual(['law']);
    expect(parsed.requirements.fieldOfStudy).toBeUndefined();
  });
});
