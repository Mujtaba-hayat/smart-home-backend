const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
});

const sendResetCodeEmail = async (email, resetCode) => {
    try {
        await transporter.sendMail({
            from: `"Smart Home" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Smart Home - Password Reset Code",

            text: `Your Smart Home password reset code is: ${resetCode}

This code will expire soon.

If you did not request a password reset, please ignore this email.`,

            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Smart Home - Password Reset</h2>

                    <p>Your password reset code is:</p>

                    <h1 style="letter-spacing: 5px;">
                        ${resetCode}
                    </h1>

                    <p>
                        This code will expire soon.
                    </p>

                    <p>
                        If you did not request a password reset,
                        please ignore this email.
                    </p>
                </div>
            `,
        });

        console.log(
            `Reset code email sent to: ${email}`
        );

    } catch (error) {
        console.error(
            "Error sending reset code email:",
            error.message
        );

        throw new Error(
            "Unable to send reset code email."
        );
    }
};

module.exports = {
    sendResetCodeEmail,
};