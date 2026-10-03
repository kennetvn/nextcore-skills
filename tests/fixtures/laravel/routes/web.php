<?php
use Illuminate\Support\Facades\Route;
Route::get('/', [HomeController::class, 'index']);
Route::get('/settings', [SettingsController::class, 'show'])->middleware('auth');
Route::get('/rooms/{room}', [RoomController::class, 'show']);
