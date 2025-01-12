let currentPage = 0;
const pages = document.querySelectorAll('.page');
const totalPages = pages.length;

window.addEventListener('wheel', (event) => {
    if (event.deltaY > 0) {
        // 向下滚动
        if (currentPage < totalPages - 1) {
            currentPage++;
        }
    } else {
        // 向上滚动
        if (currentPage > 0) {
            currentPage--;
        }
    }
    updatePage();
});

function updatePage() {
    const scrollPosition = currentPage * 100;
    document.querySelector('.container').style.transform = `translateY(-${scrollPosition}vh)`;
}
