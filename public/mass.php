<?php
$startTime = microtime(true);

if (!session_id()) session_start();

if(!isset($_SESSION['userID'])) {
	http_response_code(403);
	exit();
}

require_once('../config.php');
require_once('../db.inc.php');

header('Content-Type: application/json');

$signatureID = $_REQUEST['signatureID'];
$maskID = $_SESSION['mask'];
$output = null;

$query = 'SELECT characterName, toID, shipType, mass, time FROM jumps INNER JOIN '. EVE_DUMP .'.invTypes ON typeID = shipTypeID WHERE maskID = :maskID AND wormholeID = :signatureID ORDER BY time DESC';
$stmt = $mysql->prepare($query);
$stmt->bindValue(':signatureID', $signatureID, PDO::PARAM_INT);
$stmt->bindValue(':maskID', $maskID, PDO::PARAM_STR);
$stmt->execute();

$output['mass'] = $stmt->fetchAll(PDO::FETCH_CLASS);

$output['proccessTime'] = sprintf('%.4f', microtime(true) - $startTime);

echo json_encode($output);

?>
