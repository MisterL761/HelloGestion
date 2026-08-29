<?php
/**
 * Helper d'envoi email.
 * Utilise PHPMailer SMTP si disponible, sinon fallback sur mail().
 */

if (!defined('SMTP_HOST')) require_once __DIR__ . '/config.php';

$_phpmailerAvailable = file_exists(__DIR__ . '/vendor/autoload.php') && defined('SMTP_PASS') && SMTP_PASS !== '';

if ($_phpmailerAvailable) {
    require_once __DIR__ . '/vendor/autoload.php';
}

/**
 * Envoie un email HTML via SMTP.
 *
 * @param string $toEmail  Destinataire
 * @param string $toName   Nom du destinataire
 * @param string $subject  Sujet
 * @param string $html     Corps HTML
 * @return bool
 */
function sendMail(string $toEmail, string $toName, string $subject, string $html, string $ccEmail = null): bool {
    global $_phpmailerAvailable;
    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);

    // ── PHPMailer SMTP si disponible ──────────────────────
    if ($_phpmailerAvailable) {
        try {
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = SMTP_HOST;
            $mail->SMTPAuth   = true;
            $mail->Username   = SMTP_USER;
            $mail->Password   = SMTP_PASS;
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = SMTP_PORT;
            $mail->CharSet    = 'UTF-8';
            $mail->setFrom(FROM_EMAIL, FROM_NAME);
            $mail->addReplyTo(FROM_EMAIL, FROM_NAME);
            $mail->addAddress($toEmail, $toName);
            if ($ccEmail) {
                $mail->addCC($ccEmail);
            }
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $html;
            $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>'], "\n", $html));
            $mail->send();
            file_put_contents("$logDir/mailer.log", date('Y-m-d H:i:s') . " - SMTP OK: $toEmail (CC: " . ($ccEmail ?: 'none') . ")\n", FILE_APPEND);
            return true;
        } catch (\Exception $e) {
            file_put_contents("$logDir/mailer.log", date('Y-m-d H:i:s') . " - SMTP ERREUR: {$e->getMessage()}\n", FILE_APPEND);
            // Fallback sur mail()
        }
    }

    // ── Fallback mail() ───────────────────────────────────
    $headersList = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>',
        'X-Mailer: Hello-Gestion/2.0',
    ];
    if ($ccEmail) {
        $headersList[] = 'Cc: ' . $ccEmail;
    }
    $headers = implode("\r\n", $headersList);

    // Encodage MIME de l'objet : indispensable si le sujet contient des
    // caractères non-ASCII (accents, emojis) — sinon l'en-tête est invalide.
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $sent = mail($toEmail, $encodedSubject, $html, $headers);
    file_put_contents("$logDir/mailer.log",
        date('Y-m-d H:i:s') . " - mail() " . ($sent ? 'OK' : 'ECHEC') . ": $toEmail (CC: " . ($ccEmail ?: 'none') . ")\n", FILE_APPEND);
    return $sent;
}
