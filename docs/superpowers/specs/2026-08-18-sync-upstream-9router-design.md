# Design Specification: BeeRouter Upstream Sync Script

- **Date:** 2026-08-18
- **Target Branch:** `dev/dev`
- **Upstream Repository:** `https://github.com/tonamson/bee-router.git` (`master` branch)
- **Script Location:** `scripts/sync-upstream.sh`

---

## 1. Mục tiêu & Bối cảnh
Repository `bee-router` được fork từ `bee-router` (`https://github.com/tonamson/bee-router.git`).
Quy trình phân nhánh của repo:
- `dev/re-design` (và các nhánh feature khác): Nhánh con đang phát triển tính năng / giao diện.
- `dev/dev`: Nhánh phát triển chính (main dev branch), nơi tích hợp tất cả các thay đổi trước khi ổn định.
- `master`: Nhánh production / stable release.

Script `scripts/sync-upstream.sh` được tạo ra để tự động merge toàn bộ cập nhật mới nhất từ `master` của `bee-router` (upstream) vào nhánh `dev/dev` mà không làm gián đoạn nhánh hiện tại người dùng đang làm việc.

---

## 2. Chi tiết Luồng Thực thi của Script (`scripts/sync-upstream.sh`)

1. **Khởi tạo & Cấu hình Upstream Remote**:
   - Kiểm tra xem remote `upstream` đã tồn tại trong git config chưa.
   - Nếu chưa: tự động thực thi `git remote add upstream https://github.com/tonamson/bee-router.git`.
   - Nếu đã có: đảm bảo fetch URL chính xác.

2. **Lưu trạng thái làm việc hiện tại**:
   - Xác định nhánh hiện tại (`CURRENT_BRANCH=$(git branch --show-current)`).
   - Kiểm tra working tree (`git status --porcelain`).
   - Nếu có thay đổi chưa commit: tự động `git stash push -u -m "auto-stash-before-upstream-sync-$(date +%s)"` và bật cờ `STASHED=1`.

3. **Chuyển sang nhánh `dev/dev`**:
   - Kiểm tra nhánh `dev/dev` đã có ở local chưa.
   - Nếu chưa có local:
     - Kiểm tra trên `origin/dev/dev`: nếu có -> `git checkout -b dev/dev origin/dev/dev`.
     - Nếu origin chưa có: tạo mới `dev/dev` từ nhánh cơ sở (`git checkout -b dev/dev`).
   - Nếu đã có local: `git checkout dev/dev`.
   - Nếu có `origin/dev/dev`: chạy `git pull origin dev/dev` để đồng bộ mới nhất từ origin.

4. **Fetch & Merge Upstream**:
   - Chạy `git fetch upstream master`.
   - Thực hiện `git merge upstream/master -m "chore(sync): merge upstream/master (bee-router) into dev/dev"`.

5. **Xử lý Kết quả Merge**:
   - **Trường hợp A: Merge thành công (Không xung đột)**:
     - In thông báo thành công và danh sách các commit vừa được merge vào `dev/dev`.
     - Chuyển lại nhánh ban đầu (`git checkout "$CURRENT_BRANCH"`).
     - Nếu trước đó có stash (`STASHED=1`): thực hiện `git stash pop` để khôi phục lại các file đang làm dở.
   - **Trường hợp B: Merge có xung đột (Conflict)**:
     - Giữ nguyên trạng thái ở nhánh `dev/dev`.
     - In danh sách các file bị conflict và hướng dẫn người dùng cách resolve (`git status`, sửa file, `git commit` hoặc `git merge --abort`).
     - Cảnh báo người dùng về stash đã lưu (nếu có).

---

## 3. Tích hợp `package.json`
Thêm script vào `package.json`:
```json
{
  "scripts": {
    "sync:upstream": "bash scripts/sync-upstream.sh"
  }
}
```

---

## 4. Kiểm thử & Xác minh (Verification Plan)
1. **Kiểm tra quyền thực thi**: Chạy `chmod +x scripts/sync-upstream.sh`.
2. **Kiểm tra cú pháp**: Chạy `bash -n scripts/sync-upstream.sh`.
3. **Thử nghiệm chạy thực tế**:
   - Đứng từ nhánh `dev/re-design`.
   - Chạy `npm run sync:upstream` (hoặc `bash scripts/sync-upstream.sh`).
   - Xác nhận:
     - Remote `upstream` được thêm thành công.
     - Nhánh `dev/dev` được tạo/chuyển và merge commit từ `upstream/master`.
     - Trạng thái git tự động chuyển về lại `dev/re-design`.
