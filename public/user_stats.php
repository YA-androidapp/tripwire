<?php
//***********************************************************
//	File: 		user_stats.php
//	Author: 	Daimian
//	Created: 	6/1/2013
//	Modified: 	1/25/2014 - Daimian
//
//	Purpose:	Handles pulling user stats for options
//
//	ToDo:
//
//***********************************************************
$startTime = microtime(true);

if (!session_id()) session_start();

// Check for login - else kick
if(!isset($_SESSION['userID'])) {
	http_response_code(403);
	exit();
}

require_once('../config.php');
require_once('../db.inc.php');

header('Content-Type: application/json');

$userID = $_SESSION['userID'];

$query = 'SELECT * FROM userstats WHERE userID = :userID';
$stmt = $mysql->prepare($query);
$stmt->bindValue(':userID', $userID, PDO::PARAM_INT);
$stmt->execute();

$i = 0;
if ($row = $stmt->fetchObject()) {
	foreach ($row AS $col => $val) {
		$meta = $stmt->getColumnMeta($i);

		if ($meta['native_type'] == 'DATETIME')
			$val = date('n/j/Y h:i a', strtotime($val));
		else if ($meta['native_type'] == 'LONG')
			$val = number_format($val);

		$output[$col] = $val;
		$i++;
	}
}

$output['username'] = $_SESSION['username'];

// Get unique visits
$query = "SELECT DISTINCT systemID FROM systemVisits WHERE userID = :userID";
$stmt = $mysql->prepare($query);
$stmt->bindValue(':userID', $userID, PDO::PARAM_INT);
$stmt->execute();

$output['uniqueVisits'] = number_format($stmt->rowCount());

// Get discovered whs
$query = "SELECT DISTINCT systemID FROM systemVisits WHERE userID = :userID";
$stmt = $mysql->prepare($query);
$stmt->bindValue(':userID', $userID, PDO::PARAM_INT);
$stmt->execute();

$output['whDiscovered'] = number_format($stmt->rowCount());

$output['proccessTime'] = sprintf('%.4f', microtime(true) - $startTime);

echo json_encode($output);
