import { createLogger } from "./utils/logger";
import { SendMailService } from "./services/sendMail";
import { connectRedisWithRetry } from "./utils/servers";
import type Redis from "ioredis";
import type { Transporter } from "nodemailer";

const logger = createLogger({ file: "mailWorker" });

type MailTask =
  | { type: "signup"; email: string; verificationCode: string }
  | { type: "update-email"; newEmail: string; verificationCode: string }
  | { type: "reset-password"; email: string; mailCode: string; resetPasswordId: string };

const MAIL_QUEUE = "mail-queue";

async function handleMailTask(
  msg: MailTask,
  sendMailService: SendMailService,
  mailTransporter: Transporter,
) {
  switch (msg.type) {
    case "signup": {
      const subject = "Fakebook Signup Verification Code";
      const text = `Thank you for signing up for Fakebook.\nYour verification code: ${msg.verificationCode}\nPlease enter this code within 5 minutes.`;
      await sendMailWithRecord(sendMailService, mailTransporter, msg.email, subject, text);
      break;
    }
    case "update-email": {
      const subject = "Fakebook Email Change Verification";
      const text = `Your verification code for email update: ${msg.verificationCode}\nPlease enter this code within 5 minutes.`;
      await sendMailWithRecord(sendMailService, mailTransporter, msg.newEmail, subject, text);
      break;
    }
    case "reset-password": {
      const subject = "Fakebook Password Reset Verification";
      const text = `A password reset was requested for your Fakebook account.\nVerification code: ${msg.mailCode}\nPlease enter this code within 5 minutes.`;
      await sendMailWithRecord(sendMailService, mailTransporter, msg.email, subject, text);
      break;
    }
    default: {
      const _exhaustiveCheck: never = msg;
      logger.warn(`unknown mail type: ${_exhaustiveCheck}`);
    }
  }
}

async function sendMailWithRecord(
  sendMailService: SendMailService,
  mailTransporter: Transporter,
  address: string,
  subject: string,
  body: string,
) {
  try {
    const canSend = await sendMailService.canSendMail(address);
    if (!canSend.ok) {
      logger.warn(`throttle: cannot send to ${address}: ${canSend.reason}`);
      return;
    }
    await sendMailService.send(mailTransporter, address, subject, body);
    await sendMailService.recordSend(address);
    logger.info(`sent mail to ${address} [${subject}]`);
  } catch (e) {
    logger.warn(`failed to send mail to ${address}: ${e}`);
  }
}

async function processQueue(
  queue: string,
  redis: Redis,
  sendMailService: SendMailService,
  mailTransporter: Transporter,
) {
  while (true) {
    try {
      const res = await redis.brpop(queue, 10);
      if (!res) continue;
      const payload = res[1];
      let msg: unknown;
      try {
        msg = JSON.parse(payload);
      } catch {
        logger.error(`invalid payload in ${queue}: ${payload}`);
        continue;
      }
      if (typeof msg === "object" && msg !== null && "type" in msg) {
        await handleMailTask(msg as MailTask, sendMailService, mailTransporter);
      } else {
        logger.error(`invalid task object in ${queue}: ${payload}`);
      }
    } catch (e) {
      logger.error(`error processing ${queue}: ${e}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function main() {
  logger.info("Fakebook mail worker started");
  const redis = await connectRedisWithRetry();
  const sendMailService = new SendMailService(redis);
  const mailTransporter: Transporter = SendMailService.createTransport();
  await processQueue(MAIL_QUEUE, redis, sendMailService, mailTransporter);
}

main().catch((e) => {
  logger.error(`Fatal error: ${e}`);
  process.exit(1);
});
