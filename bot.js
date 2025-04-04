var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Bot } from 'grammy';
import { GoogleGenerativeAI } from '@google/generative-ai';
const BOT_API_SERVER = 'https://api.telegram.org';
const { TELEGRAM_BOT_TOKEN, GEMINI_API_KEY } = process.env;
if (!TELEGRAM_BOT_TOKEN || !GEMINI_API_KEY) {
    throw new Error('TELEGRAM_BOT_TOKEN and GEMINI_API_KEY must be provided!');
}
const bot = new Bot(TELEGRAM_BOT_TOKEN);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: 'You are a Telegram Chatbot. Maintain a friendly tone. Keep responses one paragraph short unless told otherwise. You have the ability to respond to audio and pictures.',
});
const chat = model.startChat();
bot.command('start', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ctx.from;
    const fullName = `${user === null || user === void 0 ? void 0 : user.first_name} ${(user === null || user === void 0 ? void 0 : user.last_name) ? user.last_name : ''}`;
    const prompt = `Welcome user with the fullname ${fullName} in one sentence.`;
    const result = yield chat.sendMessage(prompt);
    return ctx.reply(result.response.text(), { parse_mode: 'Markdown' });
}));
bot.on('message:text', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const prompt = ctx.message.text;
    const result = yield chat.sendMessage(prompt);
    return ctx.reply(result.response.text(), { parse_mode: 'Markdown' });
}));
bot.on('message:voice', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const file = yield ctx.getFile();
    const filePath = file.file_path;
    if (!filePath)
        return;
    const fileURL = `${BOT_API_SERVER}/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    const fetchedResponse = yield fetch(fileURL);
    const data = yield fetchedResponse.arrayBuffer();
    const base64Audio = Buffer.from(data).toString('base64');
    const prompt = [
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
    const result = yield chat.sendMessage(prompt);
    return ctx.reply(result.response.text(), { parse_mode: 'Markdown' });
}));
const ExtToMINE = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
};
bot.on('message:photo', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const caption = ctx.message.caption;
    const photoFile = yield ctx.getFile();
    const photoFilePath = photoFile.file_path;
    if (!photoFilePath)
        return;
    const photoURL = `${BOT_API_SERVER}/file/bot${TELEGRAM_BOT_TOKEN}/${photoFilePath}`;
    const fetchedResponse = yield fetch(photoURL);
    const data = yield fetchedResponse.arrayBuffer();
    const base64Photo = Buffer.from(data).toString('base64');
    let match = photoFilePath.match(/[^.]+$/);
    if (!match)
        return;
    let photoExt = match[0];
    const prompt = [
        { inlineData: { mimeType: ExtToMINE[photoExt], data: base64Photo } },
        { text: caption !== null && caption !== void 0 ? caption : 'Describe what you see in the photo' },
    ];
    const result = yield chat.sendMessage(prompt);
    return ctx.reply(result.response.text(), { parse_mode: 'Markdown' });
}));
bot.catch((error) => {
    const ctx = error.ctx;
    console.log(error);
    return ctx.reply('Something went wrong. Try again!');
});
bot.start();
