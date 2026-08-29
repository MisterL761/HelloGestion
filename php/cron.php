<?php
/**
 * cron.php — Point d'entrée unique pour toutes les tâches planifiées
 *
 * Tâches incluses :
 *   1. Vérification des niveaux de stock (check_stock_api.php)
 *   2. Rapport mensuel automatique (cron_monthly_report.php)
 *
 * Crontab recommandé :
 *   # Vérification stock — tous les jours à 08h00
 *   0 8 * * * /usr/bin/php /chemin/php/cron.php?task=stock >> /chemin/php/logs/cron.log 2>&1
 *
 *   # Rapport mensuel — le 1er de chaque mois à 07h00
 *   0 7 1 * * /usr/bin/php /chemin/php/cron_monthly_report.php >> /chemin/php/logs/cron_monthly_report.log 2>&1
 */

require_once __DIR__ . '/check_stock_api.php';
