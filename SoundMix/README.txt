RE: summER - 후편집 DAW 데모

실행 방법
- VSCode Live Server 등 로컬 서버로 index.html을 실행하세요.
- 캔버스 크기: 1280 x 720

이번 버전 주요 기능
- PREVIEW 버튼 제거
- PLAY / STOP 버튼과 Space Bar로 재생·정지
- 상단 재생바 영역 클릭 또는 드래그로 재생 위치 이동
- BPM 직접 입력 및 +/- 버튼 조절
- 가로/세로 줌, 가로/세로 스크롤바 드래그 이동
- SOUND 패널에서 소리를 클릭하면 해당 트랙과 배치된 클립 위치가 잘 보이도록 Arrangement가 자동 이동
- 왼쪽 더블클릭으로 클립 추가, 왼쪽 한 번 클릭으로 클립 선택, 오른쪽 클릭으로 개별 편집창 열기
- DELETE 버튼 또는 Delete/Backspace 키로 선택 클립 삭제
- 오디오 파일 파형을 분석해 클립 안에 표시

공동 작업물 연결
- 핵심 파일: PostEditSystem.js
- 유지한 구조: SoundManager, MixTrack, ClipInstance, MixerUI, gameState.EDITING
