const { transporter } = require("../configs/gmail.smtp");
const ejs = require("ejs");
const path = require("path");
const { EMAIL_TYPES } = require("../constants");
const { generateJwtToken } = require("../helpers");

exports.sendAccountVerificationEmail = async (user) => {
  try {
    const token = generateJwtToken({ email: user?.get()?.email });
    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/account-verification.ejs"),
      {
        display_name: user?.display_name,
        verify_account_url: `${process.env.CLIENT_BASE_URL}/account-verification/${token}`,
        project_name: process.env.PROJECT_NAME,
      }
    );
    let resData = await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: user?.get()?.email,
      subject: "Verify Your Account",
      html,
    });
    if (resData && Object.keys(resData)?.length) {
      await user.createEmailSendHistory({
        accepted_emails: resData?.accepted,
        rejected_emails: resData?.rejected,
        message_id: resData?.messageId,
        response_message: resData?.response,
        envelope: resData?.envelope,
        full_response: resData,
        email_type: EMAIL_TYPES.ACCOUNT_VERIFICATION,
      });
    }
  } catch (error) {
    throw new Error(error);
  }
};

exports.sendResetPasswordEmail = async (user) => {
  try {
    const token = generateJwtToken({ email: user?.get()?.email });
    const html = await ejs.renderFile(
      path.join(__dirname, "../templates/reset-password.ejs"),
      {
        display_name: user?.display_name,
        reset_password_url: `${process.env.CLIENT_BASE_URL}/reset-password/${token}`,
        project_name: process.env.PROJECT_NAME,
      }
    );
    let resData = await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: user?.get()?.email,
      subject: "Reset Your Password",
      html,
    });
    if (resData && Object.keys(resData)?.length) {
      await user.createEmailSendHistory({
        accepted_emails: resData?.accepted,
        rejected_emails: resData?.rejected,
        message_id: resData?.messageId,
        response_message: resData?.response,
        envelope: resData?.envelope,
        full_response: resData,
        email_type: EMAIL_TYPES.ACCOUNT_VERIFICATION,
      });
    }
  } catch (error) {
    throw new Error(error);
  }
};
