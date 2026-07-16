from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import random
import string
import time
import os

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, 'dist')

games = {}

ROLES = {
    'werewolf': {'name': '狼人', 'team': 'werewolf', 'icon': '🐺'},
    'wolf_king': {'name': '狼王', 'team': 'werewolf', 'icon': '👑🐺'},
    'white_wolf': {'name': '白狼王', 'team': 'werewolf', 'icon': '🤍🐺'},
    'mechanical_wolf': {'name': '机械狼', 'team': 'werewolf', 'icon': '🤖🐺'},
    'wolf_beauty': {'name': '狼美人', 'team': 'werewolf', 'icon': '💄🐺'},
    'seer': {'name': '预言家', 'team': 'god', 'icon': '🔮'},
    'witch': {'name': '女巫', 'team': 'god', 'icon': '🧙‍♀️'},
    'hunter': {'name': '猎人', 'team': 'god', 'icon': '🏹'},
    'guard': {'name': '守卫', 'team': 'god', 'icon': '🛡️'},
    'knight': {'name': '骑士', 'team': 'god', 'icon': '⚔️'},
    'medium': {'name': '通灵师', 'team': 'god', 'icon': '👻'},
    'idiot': {'name': '白痴', 'team': 'god', 'icon': '🤪'},
    'villager': {'name': '平民', 'team': 'villager', 'icon': '👨‍🌾'},
}

CREATE_PASSWORD = '13542'

def generate_key():
    return ''.join(random.choices(string.digits, k=6))

def generate_room_id():
    return ''.join(random.choices(string.digits, k=3))

@app.route('/')
def index():
    if os.path.exists(DIST_DIR):
        return send_from_directory(DIST_DIR, 'index.html')
    return '请先构建前端项目', 404

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(DIST_DIR):
        file_path = os.path.join(DIST_DIR, path)
        if os.path.isfile(file_path):
            return send_from_directory(DIST_DIR, path)
        return send_from_directory(DIST_DIR, 'index.html')
    return 'Not found', 404

@app.route('/api/enter', methods=['POST'])
def api_enter():
    data = request.json
    key = data.get('key', '')
    
    if not key:
        return jsonify({'success': False, 'error': '请输入秘钥'})
    
    if key == CREATE_PASSWORD:
        for room_id, game in games.items():
            return jsonify({'success': True, 'redirect': f'/host/{room_id}'})
        return jsonify({'success': False, 'error': '没有找到房间'})
    
    for room_id, game in games.items():
        for player in game['players']:
            if player['key'] == key:
                return jsonify({'success': True, 'redirect': f'/game?key={key}'})
    
    return jsonify({'success': False, 'error': '秘钥无效'})

@app.route('/api/player_game')
def api_player_game():
    player_key = request.args.get('key')
    
    if not player_key:
        return jsonify({'error': '缺少玩家秘钥'}), 400
    
    for room_id, game in games.items():
        for player in game['players']:
            if player['key'] == player_key:
                return jsonify({'room_id': room_id, 'game': game})
    
    return jsonify({'error': '秘钥无效'}), 404

@app.route('/api/create_game', methods=['POST'])
def create_game():
    data = request.json
    if data.get('password') != CREATE_PASSWORD:
        return jsonify({'error': '创建密码错误'}), 403
    
    roles_config = data.get('roles', {})
    speech_time = data.get('speech_time', 2)
    witch_self_save = data.get('witch_self_save', False)
    players = []
    
    for role_id, count in roles_config.items():
        for _ in range(int(count)):
            role = ROLES[role_id]
            players.append({
                'name': '',
                'key': generate_key(),
                'role': role_id,
                'role_name': role['name'],
                'role_icon': role['icon'],
                'team': role['team'],
                'alive': True,
                'has_voted': False,
                'vote_target': None,
                'has_checked': False,
                'check_target': None
            })
    
    if len(players) < 3:
        return jsonify({'error': '至少需要3名玩家'}), 400
    
    random.shuffle(players)
    
    for i, p in enumerate(players):
        p['name'] = f'{i+1}号'
    
    room_id = generate_room_id()
    
    games[room_id] = {
        'room_id': room_id,
        'players': players,
        'current_day': 1,
        'phase': 'waiting',
        'pk_mode': 'normal',
        'pk_targets': [],
        'votes': {},
        'vote_revealed': False,
        'vote_timer': 0,
        'vote_countdown': 0,
        'night_timer': 0,
        'night_countdown': 60,
        'check_results': [],
        'roles_config': roles_config,
        'daily_actions': [],
        'speech_time': speech_time,
        'witch_self_save': witch_self_save
    }
    
    return jsonify({'room_id': room_id, 'admin_key': CREATE_PASSWORD})

@app.route('/api/game/<room_id>')
def api_game(room_id):
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    return jsonify(game)

@app.route('/api/start_vote/<room_id>', methods=['POST'])
def api_start_vote(room_id):
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    for p in game['players']:
        p['has_voted'] = False
        p['vote_target'] = None
    
    game['phase'] = 'voting'
    game['pk_mode'] = 'normal'
    game['pk_targets'] = []
    game['vote_countdown'] = 10
    game['vote_revealed'] = False
    game['vote_timer'] = time.time()
    
    return jsonify({'success': True, 'countdown': 10})

@app.route('/api/start_pk/<room_id>', methods=['POST'])
def api_start_pk(room_id):
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    data = request.json
    pk_targets = data.get('targets', [])
    
    for p in game['players']:
        p['has_voted'] = False
        p['vote_target'] = None
    
    game['phase'] = 'pk'
    game['pk_mode'] = 'pk'
    game['pk_targets'] = pk_targets
    game['vote_countdown'] = 10
    game['vote_revealed'] = False
    game['vote_timer'] = time.time()
    
    return jsonify({'success': True, 'countdown': 10})

@app.route('/api/vote', methods=['POST'])
def api_vote():
    data = request.json
    room_id = data.get('room_id')
    secret_key = data.get('secret_key')
    target_name = data.get('target')
    
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    if game['phase'] not in ['voting', 'pk']:
        return jsonify({'error': '当前不是投票时间'}), 403
    
    elapsed = time.time() - game['vote_timer']
    if elapsed > 10:
        return jsonify({'error': '投票时间已结束'}), 403
    
    player = None
    target_player = None
    for p in game['players']:
        if p['key'] == secret_key:
            player = p
        if p['name'] == target_name:
            target_player = p
    
    if not player:
        return jsonify({'error': '秘钥无效'}), 404
    
    if not player['alive']:
        return jsonify({'error': '你已出局，无法投票'}), 403
    
    if target_name != 'abstain' and target_player and not target_player['alive']:
        return jsonify({'error': '该玩家已出局'}), 403
    
    if game['phase'] == 'pk' and target_name != 'abstain' and target_name not in game['pk_targets']:
        return jsonify({'error': '只能投PK目标'}), 403
    
    player['has_voted'] = True
    player['vote_target'] = target_name
    
    vote_key = f'day_{game["current_day"]}_{game["pk_mode"]}'
    if vote_key not in game['votes']:
        game['votes'][vote_key] = {}
    
    game['votes'][vote_key][secret_key] = target_name
    
    return jsonify({'success': True, 'remaining': max(0, 10 - int(elapsed))})

@app.route('/api/end_vote/<room_id>', methods=['POST'])
def api_end_vote(room_id):
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    game['phase'] = 'waiting'
    game['vote_revealed'] = True
    game['vote_countdown'] = 0
    
    return jsonify({'success': True})

@app.route('/api/next_day/<room_id>', methods=['POST'])
def api_next_day(room_id):
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    game['current_day'] += 1
    game['vote_revealed'] = False
    game['phase'] = 'waiting'
    game['pk_mode'] = 'normal'
    game['pk_targets'] = []
    
    for p in game['players']:
        p['has_voted'] = False
        p['vote_target'] = None
    
    return jsonify({'success': True})

@app.route('/api/reveal_votes/<room_id>', methods=['POST'])
def api_reveal_votes(room_id):
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    game['vote_revealed'] = True
    return jsonify({'success': True})

@app.route('/api/eliminate/<room_id>', methods=['POST'])
def api_eliminate(room_id):
    data = request.json
    player_name = data.get('player_name')
    reason = data.get('reason', '投票淘汰')
    
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    for p in game['players']:
        if p['name'] == player_name:
            p['alive'] = False
            
            game['daily_actions'].append({
                'day': game['current_day'],
                'type': 'eliminate',
                'player': player_name,
                'reason': reason,
                'role': p['role_name'],
                'team': p['team']
            })
            break
    
    return jsonify({'success': True})

@app.route('/api/self_destruct/<room_id>', methods=['POST'])
def api_self_destruct(room_id):
    data = request.json
    player_name = data.get('player_name')
    
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    player = None
    for p in game['players']:
        if p['name'] == player_name:
            player = p
            break
    
    if not player:
        return jsonify({'error': '玩家不存在'}), 404
    
    if player['team'] != 'werewolf':
        return jsonify({'error': '只有狼人才能自爆'}), 403
    
    if not player['alive']:
        return jsonify({'error': '玩家已出局'}), 403
    
    player['alive'] = False
    
    game['daily_actions'].append({
        'day': game['current_day'],
        'type': 'self_destruct',
        'player': player_name,
        'role': player['role_name'],
        'team': player['team']
    })
    
    return jsonify({'success': True})

@app.route('/api/revive/<room_id>', methods=['POST'])
def api_revive(room_id):
    data = request.json
    player_name = data.get('player_name')
    
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    for p in game['players']:
        if p['name'] == player_name:
            p['alive'] = True
            break
    
    return jsonify({'success': True})

@app.route('/api/reset_game/<room_id>', methods=['POST'])
def api_reset_game(room_id):
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    roles_config = game.get('roles_config', {})
    old_players = game['players']
    
    new_roles = []
    for role_id, count in roles_config.items():
        for _ in range(int(count)):
            new_roles.append(role_id)
    
    random.shuffle(new_roles)
    
    for i, p in enumerate(old_players):
        if i < len(new_roles):
            role_id = new_roles[i]
            role = ROLES[role_id]
            p['role'] = role_id
            p['role_name'] = role['name']
            p['role_icon'] = role['icon']
            p['team'] = role['team']
            p['alive'] = True
            p['has_voted'] = False
            p['vote_target'] = None
            p['has_checked'] = False
            p['check_target'] = None
    
    game['current_day'] = 1
    game['phase'] = 'waiting'
    game['pk_mode'] = 'normal'
    game['pk_targets'] = []
    game['votes'] = {}
    game['vote_revealed'] = False
    game['vote_timer'] = 0
    game['vote_countdown'] = 0
    game['night_timer'] = 0
    game['night_countdown'] = 60
    game['check_results'] = []
    game['daily_actions'] = []
    
    if 'speech_time' not in game:
        game['speech_time'] = 2
    if 'witch_self_save' not in game:
        game['witch_self_save'] = False
    
    return jsonify({'success': True})

@app.route('/api/enter_night/<room_id>', methods=['POST'])
def api_enter_night(room_id):
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    for p in game['players']:
        p['has_checked'] = False
        p['check_target'] = None
    
    game['phase'] = 'night'
    game['night_timer'] = time.time()
    game['night_countdown'] = 60
    
    return jsonify({'success': True})

@app.route('/api/end_night/<room_id>', methods=['POST'])
def api_end_night(room_id):
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    game['phase'] = 'waiting'
    game['night_timer'] = 0
    game['night_countdown'] = 0
    
    return jsonify({'success': True})

@app.route('/api/check', methods=['POST'])
def api_check():
    data = request.json
    room_id = data.get('room_id')
    secret_key = data.get('secret_key')
    target = data.get('target')
    
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    if game['phase'] != 'night':
        return jsonify({'error': '当前不是夜间'}), 403
    
    player = None
    target_player = None
    for p in game['players']:
        if p['key'] == secret_key:
            player = p
        if p['name'] == target:
            target_player = p
    
    if not player:
        return jsonify({'error': '秘钥无效'}), 404
    
    if player['role'] != 'seer':
        return jsonify({'error': '你不是预言家'}), 403
    
    if not player['alive']:
        return jsonify({'error': '你已出局'}), 403
    
    if player['has_checked']:
        return jsonify({'error': '你已经查验过了'}), 403
    
    if not target_player:
        return jsonify({'error': '目标玩家不存在'}), 404
    
    if not target_player['alive']:
        return jsonify({'error': '目标玩家已出局'}), 403
    
    is_wolf = target_player['team'] == 'werewolf'
    result = '狼人' if is_wolf else '好人'
    
    player['has_checked'] = True
    player['check_target'] = target
    
    game['check_results'].append({
        'voter': player['name'],
        'target': target,
        'result': result,
        'day': game['current_day']
    })
    
    return jsonify({'success': True, 'result': result})

@app.route('/api/check_status/<room_id>')
def api_check_status(room_id):
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    player_key = request.args.get('player_key')
    
    player = None
    for p in game['players']:
        if p['key'] == player_key:
            player = p
            break
    
    if not player:
        return jsonify({'error': '玩家不存在'}), 404
    
    annotations = {}
    if player['check_target']:
        for result in game['check_results']:
            if result['voter'] == player['name']:
                annotations[result['target']] = '狼' if result['result'] == '狼人' else '金'
    
    return jsonify({'has_checked': player['has_checked'], 'annotations': annotations})

@app.errorhandler(404)
def not_found(e):
    if os.path.exists(DIST_DIR):
        return send_from_directory(DIST_DIR, 'index.html')
    return 'Not found', 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
