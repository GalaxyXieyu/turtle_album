#!/bin/bash

# Turtle Album - 本地开发管理脚本
# 用法: ./dev.sh [start|stop|status|restart]

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_PID_FILE="/tmp/turtle-backend.pid"
FRONTEND_PID_FILE="/tmp/turtle-frontend.pid"
BACKEND_LOG="/tmp/turtle-backend.log"
FRONTEND_LOG="/tmp/turtle-frontend.log"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# 检查后端状态
check_backend() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# 检查前端状态
check_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# 启动后端
start_backend() {
    # 清理过期的 PID 文件
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ! ps -p $PID > /dev/null 2>&1; then
            print_warn "清理过期的后端 PID 文件"
            rm -f "$BACKEND_PID_FILE"
        fi
    fi

    if check_backend; then
        print_info "后端已在运行"
        return 0
    fi

    # 检查虚拟环境（支持 venv 和 .venv 两种命名）
    VENV_PATH=""
    if [ -d "$BACKEND_DIR/venv" ]; then
        VENV_PATH="$BACKEND_DIR/venv"
    elif [ -d "$BACKEND_DIR/.venv" ]; then
        VENV_PATH="$BACKEND_DIR/.venv"
    else
        print_error "后端虚拟环境不存在"
        echo "请先运行: cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
        return 1
    fi

    print_info "启动后端服务..."
    cd "$BACKEND_DIR"
    source "$VENV_PATH/bin/activate"
    nohup python run.py > "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"

    sleep 3
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_info "后端启动成功 (http://localhost:8000)"
    else
        print_warn "后端可能未正常启动，请检查日志: tail -f $BACKEND_LOG"
    fi
}

# 启动前端
start_frontend() {
    # 清理过期的 PID 文件
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ! ps -p $PID > /dev/null 2>&1; then
            print_warn "清理过期的前端 PID 文件"
            rm -f "$FRONTEND_PID_FILE"
        fi
    fi

    if check_frontend; then
        print_info "前端已在运行"
        return 0
    fi

    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        print_error "前端依赖未安装"
        echo "请先运行: cd frontend && npm install"
        return 1
    fi

    print_info "启动前端服务..."
    cd "$FRONTEND_DIR"
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"

    # 等待前端启动并获取实际端口
    sleep 3
    if [ -f "$FRONTEND_LOG" ]; then
        FRONTEND_PORT=$(grep -oE "localhost:[0-9]+" "$FRONTEND_LOG" | tail -1 | cut -d: -f2)
        if [ -n "$FRONTEND_PORT" ]; then
            print_info "前端启动成功 (http://localhost:$FRONTEND_PORT)"
        else
            print_info "前端启动成功 (检查日志获取端口: tail -f $FRONTEND_LOG)"
        fi
    fi
}

# 停止后端
stop_backend() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            print_info "停止后端服务 (PID: $PID)..."
            kill $PID
            rm -f "$BACKEND_PID_FILE"
            print_info "后端已停止"
        else
            print_warn "后端服务未运行"
            rm -f "$BACKEND_PID_FILE"
        fi
    else
        print_warn "后端服务未运行"
    fi
}

# 停止前端
stop_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            print_info "停止前端服务 (PID: $PID)..."
            kill $PID
            rm -f "$FRONTEND_PID_FILE"
            print_info "前端已停止"
        else
            print_warn "前端服务未运行"
            rm -f "$FRONTEND_PID_FILE"
        fi
    else
        print_warn "前端服务未运行"
    fi
}

# 显示状态
show_status() {
    print_header "Turtle Album 服务状态"
    echo ""

    echo "📡 后端服务:"
    if check_backend; then
        PID=$(cat "$BACKEND_PID_FILE")
        echo "   ✅ 运行中 (PID: $PID)"
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            echo "   ✅ 健康检查通过"
        else
            echo "   ⚠️  健康检查失败"
        fi
    else
        echo "   ❌ 未运行"
    fi

    echo ""
    echo "🎨 前端服务:"
    if check_frontend; then
        PID=$(cat "$FRONTEND_PID_FILE")
        echo "   ✅ 运行中 (PID: $PID)"

        # 从日志中提取实际端口
        if [ -f "$FRONTEND_LOG" ]; then
            FRONTEND_PORT=$(grep -oE "localhost:[0-9]+" "$FRONTEND_LOG" | tail -1 | cut -d: -f2)
            if [ -n "$FRONTEND_PORT" ]; then
                echo "   ✅ 可访问: http://localhost:$FRONTEND_PORT"
            fi
        fi
    else
        echo "   ❌ 未运行"
    fi

    echo ""
    echo "📍 访问地址:"
    echo "   🌐 前端: http://localhost:8080 (如被占用会自动使用 8081)"
    echo "   📡 后端: http://localhost:8000"
    echo "   📚 文档: http://localhost:8000/docs"
    echo ""
    echo "📝 日志文件:"
    echo "   后端: tail -f $BACKEND_LOG"
    echo "   前端: tail -f $FRONTEND_LOG"
}

# 启动所有服务
start_all() {
    print_header "启动 Turtle Album 开发环境"
    echo ""

    # 先停止已有服务，确保端口不冲突
    if check_backend || check_frontend; then
        print_info "检测到已有服务运行，先停止..."
        stop_backend
        stop_frontend
        sleep 1
        echo ""
    fi

    start_backend
    start_frontend
    echo ""
    print_info "开发环境启动完成！"
    echo ""
    show_status
}

# 停止所有服务
stop_all() {
    print_header "停止 Turtle Album 服务"
    echo ""
    stop_backend
    stop_frontend
    echo ""
    print_info "所有服务已停止"
}

# 重启所有服务
restart_all() {
    print_header "重启 Turtle Album 服务"
    echo ""
    stop_all
    sleep 2
    start_all
}

# 显示帮助
show_help() {
    echo "Turtle Album - 本地开发管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start     启动所有服务（前端 + 后端）"
    echo "  stop      停止所有服务"
    echo "  restart   重启所有服务"
    echo "  status    查看服务状态"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start    # 启动开发环境"
    echo "  $0 status   # 查看服务状态"
    echo "  $0 stop     # 停止所有服务"
}

# 主逻辑
case "${1:-help}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
