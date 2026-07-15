from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import random
import string
import time

app = Flask(__name__)
app.secret_key = 'werewolf-game-secret-key'

games = {}

# 扩展角色定义
ROLES = {
    # 狼人阵营
    'werewolf': {'name': '狼人', 'team': 'werewolf', 'icon': '🐺'},
    'wolf_king': {'name': '狼王', 'team': 'werewolf', 'icon': '👑🐺'},
    'white_wolf': {'name': '白狼王', 'team': 'werewolf', 'icon': '🤍🐺'},
    'mechanical_wolf': {'name': '机械狼', 'team': 'werewolf', 'icon': '🤖🐺'},
    'wolf_beauty': {'name': '狼美人', 'team': 'werewolf', 'icon': '💄🐺'},
    # 神职阵营
    'seer': {'name': '预言家', 'team': 'god', 'icon': '🔮'},
    'witch': {'name': '女巫', 'team': 'god', 'icon': '🧙‍♀️'},
    'hunter': {'name': '猎人', 'team': 'god', 'icon': '🏹'},
    'guard': {'name': '守卫', 'team': 'god', 'icon': '🛡️'},
    'knight': {'name': '骑士', 'team': 'god', 'icon': '⚔️'},
    'medium': {'name': '通灵师', 'team': 'god', 'icon': '👻'},
    'idiot': {'name': '白痴', 'team': 'god', 'icon': '🤪'},
    # 平民阵营
    'villager': {'name': '平民', 'team': 'villager', 'icon': '👨‍🌾'},
}

def generate_key():
    """生成6位纯数字秘钥"""
    return ''.join(random.choices(string.digits, k=6))

def generate_room_id():
    """生成3位数字房间号"""
    return ''.join(random.choices(string.digits, k=3))

def generate_admin_key():
    """生成8位管理员秘钥（字母+数字）"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

@app.route('/')
def index():
    return render_template('enter.html')

@app.route('/create')
def create_page():
    return render_template('index.html')

@app.route('/api/enter', methods=['POST'])
def api_enter():
    """统一入口验证"""
    data = request.json
    room_id = data.get('room_id', '')
    key = data.get('key', '')
    
    game = games.get(room_id)
    if not game:
        return jsonify({'success': False, 'error': '房间不存在'})
    
    # 检查是否是管理员（使用固定密码）
    if key == ADMIN_PASSWORD:
        return jsonify({'success': True, 'redirect': f'/host/{room_id}'})
    
    # 检查是否是玩家
    for player in game['players']:
        if player['key'] == key:
            return jsonify({'success': True, 'redirect': f'/game?room={room_id}&key={key}'})
    
    return jsonify({'success': False, 'error': '秘钥无效'})

CREATE_PASSWORD = '13542'
ADMIN_PASSWORD = '13544'

@app.route('/create_game', methods=['POST'])
def create_game():
    data = request.json
    
    # 验证创建密码
    if data.get('password') != CREATE_PASSWORD:
        return jsonify({'error': '创建密码错误'}), 403
    
    roles_config = data.get('roles', {})
    
    # 构建玩家列表
    players = []
    for role_id, count in roles_config.items():
        for _ in range(int(count)):
            players.append({
                'name': '',
                'key': generate_key(),
                'role': role_id,
                'role_name': ROLES[role_id]['name'],
                'role_icon': ROLES[role_id]['icon'],
                'team': ROLES[role_id]['team'],
                'alive': True,
                'has_voted': False,
                'vote_target': None
            })
    
    if len(players) < 3:
        return jsonify({'error': '至少需要3名玩家'}), 400
    
    random.shuffle(players)
    
    # 分配玩家名称
    for i, p in enumerate(players):
        p['name'] = f'{i+1}号'
    
    room_id = generate_room_id()
    admin_key = CREATE_PASSWORD  # 管理员秘钥直接使用创建密码
    
    games[room_id] = {
        'room_id': room_id,
        'admin_key': admin_key,
        'players': players,
        'current_day': 1,
        'phase': 'waiting',
        'pk_mode': 'normal',
        'pk_targets': [],
        'votes': {},
        'vote_revealed': False,
        'vote_timer': 0,
        'vote_countdown': 0,
        'created_at': time.time(),
        'roles_config': roles_config
    }
    
    return jsonify({
        'room_id': room_id,
        'admin_key': admin_key
    })

@app.route('/host/<room_id>')
def host(room_id):
    game = games.get(room_id)
    
    if not game:
        return '房间不存在', 404
    
    return render_template('host.html', game=game, ROLES=ROLES)

@app.route('/game')
def game():
    """玩家游戏页面"""
    room_id = request.args.get('room')
    secret_key = request.args.get('key')
    
    if not room_id or not secret_key:
        return redirect('/')
    
    game = games.get(room_id)
    if not game:
        return render_template('player_error.html', error='房间不存在')
    
    player = None
    for p in game['players']:
        if p['key'] == secret_key:
            player = p
            break
    
    if not player:
        return render_template('player_error.html', error='秘钥无效')
    
    return render_template('player.html', game=game, player=player, ROLES=ROLES)

@app.route('/api/game/<room_id>')
def api_game(room_id):
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    safe_game = dict(game)
    safe_game.pop('admin_key', None)
    return jsonify(safe_game)

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
    """开始PK投票"""
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
    
    # 检查目标是否存活（除非是弃票）
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
    
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    for p in game['players']:
        if p['name'] == player_name:
            p['alive'] = False
            break
    
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
    """结束本局，重新随机分配身份（保持号码和秘钥不变）"""
    game = games.get(room_id)
    if not game:
        return jsonify({'error': '房间不存在'}), 404
    
    roles_config = game.get('roles_config', {})
    old_players = game['players']
    
    # 收集现有角色配置
    new_roles = []
    for role_id, count in roles_config.items():
        for _ in range(int(count)):
            new_roles.append(role_id)
    
    # 随机打乱角色
    random.shuffle(new_roles)
    
    # 保持号码和秘钥不变，只更新身份
    for i, p in enumerate(old_players):
        if i < len(new_roles):
            role_id = new_roles[i]
            p['role'] = role_id
            p['role_name'] = ROLES[role_id]['name']
            p['role_icon'] = ROLES[role_id]['icon']
            p['team'] = ROLES[role_id]['team']
            p['alive'] = True
            p['has_voted'] = False
            p['vote_target'] = None
    
    # 重置游戏状态
    game['current_day'] = 1
    game['phase'] = 'waiting'
    game['pk_mode'] = 'normal'
    game['pk_targets'] = []
    game['votes'] = {}
    game['vote_revealed'] = False
    game['vote_timer'] = 0
    game['vote_countdown'] = 0
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)