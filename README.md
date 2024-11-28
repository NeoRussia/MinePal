# MinePal

## Overview

MinePal is a Minecraft companion app with a React frontend, a local backend, and an AI agent.

## Structure

```mermaid
%%{init:{'theme':'dark'}}%%
graph TD
	Player((Player))
	
	subgraph Client PC
		
		subgraph Minecraft
			Player_Character[Player Character]
			MinePal_Bot[MinePal Bot]
		end
		
		subgraph MinePal Electron App
			GUI[GUI]
			Local_Server[Local Backend Server]
			subgraph Subprocess
				subgraph Agent
					subgraph System 1
					  Mineflayer
					  mode
					  skills
					  world
					  Timer((Timer))
					end
					subgraph System 2
						Agent_[Agent]
						actions
					end
				end
			end
		end
	end
	
	subgraph Remote Servers
		OpenAI_API[OpenAI API]
	end
	
	Player -->|操作| Player_Character
	Player -->|設定やボット起動・停止| GUI
  GUI -..->|設定の参照・変更<br>ボットの起動・停止| Local_Server
  GUI -.......->|APIキーの有効性確認| OpenAI_API
  Local_Server -->|ボットの起動や指示| Agent
  Mineflayer -->|イベント通知<br>（チャットや状況変化）| Agent_
  Agent_ -..->|コマンド実行| actions
  actions -..->|スキル実行| skills
  skills -..->|Bot操作| Mineflayer
  Mineflayer -..->|Bot操作| MinePal_Bot
  skills -..->|環境情報取得| world
  world -..->|環境情報取得| Mineflayer
  Mineflayer -..->|環境情報取得| Minecraft
  MinePal_Bot -...->|イベント通知<br>（チャット）| Mineflayer
  Minecraft -..->|イベント通知<br>（状況変化）| Mineflayer
	Player_Character -->|チャット（指示）| MinePal_Bot
  Agent_ -.......->|発話意図解析や応答生成| OpenAI_API
  Timer -->|1秒おきに実行| mode
  mode -->|モードに応じて<br>動作を実行| skills
  mode -->|環境情報取得| world
```

## ビルド手順

### 前提条件

ビルドに必要な環境

- node.js v20

### 1. フロントエンドのビルド

Electronアプリケーションのビルドの前準備としてまずはフロントエンドをビルドする必要がある。

1. フロントエンドのあるディレクトリ `frontend` に移動する。

   ```sh
   cd frontend
   ```

2. 依存ライブラリをインストールする。

   ```sh
   npm install
   ```

3. ビルドを実行する。

   ```sh
   npm run build
   ```

   ビルドが成功すると `frontend/dist/` ディレクトリの中にHTML/JS/CSS等のファイルが出力される。

### 2. Electronアプリケーションのビルド

1. `MinePal` ディレクトリ直下に戻る。

   ```sh
   cd ..
   ```

2. 依存ライブラリをインストールする。

   ```sh
   npm install
   ```

3. ビルドを実行する。

   ```sh
   npm run buildLocal
   ```

   ビルドが成功すると `dist/` ディレクトリの中にバイナリが出力される。  
   コードのテストが目的であれば、時間のかかるビルドを行うのではなく、次のコマンドを実行すればすぐアプリケーションを起動することができる。

   ```sh
   npm run start
   ```
