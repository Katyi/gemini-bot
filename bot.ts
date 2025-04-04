import { Bot } from 'grammy';
import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import type { User, File } from 'grammy/types';

const BOT_API_SERVER = 'https://api.telegram.org';
const { TELEGRAM_BOT_TOKEN, GEMINI_API_KEY } = process.env;
if (!TELEGRAM_BOT_TOKEN || !GEMINI_API_KEY) {
  throw new Error('TELEGRAM_BOT_TOKEN and GEMINI_API_KEY must be provided!');
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction:
    'You are a Telegram Chatbot. Maintain a friendly tone. Keep responses one paragraph short unless told otherwise. You have the ability to respond to audio and pictures.',
});

const chat = model.startChat();

bot.command('start', async (ctx) => {
  const user: User | undefined = ctx.from;
  const fullName: string = `${user?.first_name} ${
    user?.last_name ? user.last_name : ''
  }`;
  const prompt: string = `Welcome user with the fullname ${fullName} in one sentence.`;
  const result = await chat.sendMessage(prompt);
  return ctx.reply(result.response.text(), { parse_mode: 'Markdown' });
});

bot.on('message:text', async (ctx) => {
  const prompt: string = ctx.message.text;
  const result = await chat.sendMessage(prompt);
  return ctx.reply(result.response.text(), { parse_mode: 'Markdown' });
});

bot.on('message:voice', async (ctx) => {
  const file: File = await ctx.getFile();
  const filePath: string | undefined = file.file_path;
  if (!filePath) return;

  const fileURL: string = `${BOT_API_SERVER}/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const fetchedResponse = await fetch(fileURL);
  const data: ArrayBuffer = await fetchedResponse.arrayBuffer();
  const base64Audio: string = Buffer.from(data).toString('base64');

  const prompt: Array<string | Part> = [
    {
      inlineData: {
        mimeType: 'audio/ogg',
        data: base64Audio,
      },
    },
    {
      text: 'Please respond to the audio prompt.',
    },
  ];
  const result = await chat.sendMessage(prompt);
  return ctx.reply(result.response.text(), { parse_mode: 'Markdown' });
});

type MINE = 'image/jpeg' | 'image/png';
const ExtToMINE: Record<string, MINE> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
};

bot.on('message:photo', async (ctx) => {
  const caption: string | undefined = ctx.message.caption;
  const photoFile: File = await ctx.getFile();
  const photoFilePath: string | undefined = photoFile.file_path;
  if (!photoFilePath) return;

  const photoURL: string = `${BOT_API_SERVER}/file/bot${TELEGRAM_BOT_TOKEN}/${photoFilePath}`;
  const fetchedResponse = await fetch(photoURL);

  const data: ArrayBuffer = await fetchedResponse.arrayBuffer();
  const base64Photo: string = Buffer.from(data).toString('base64');
  let match: RegExpMatchArray | null = photoFilePath.match(/[^.]+$/);
  if (!match) return;

  let photoExt: string = match[0];
  const prompt: Array<string | Part> = [
    { inlineData: { mimeType: ExtToMINE[photoExt], data: base64Photo } },
    { text: caption ?? 'Describe what you see in the photo' },
  ];

  const result = await chat.sendMessage(prompt);
  return ctx.reply(result.response.text(), { parse_mode: 'Markdown' });
});

bot.catch((error) => {
  const ctx = error.ctx;
  console.log(error);
  return ctx.reply('Something went wrong. Try again!');
});

bot.start();
