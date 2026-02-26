class ZathuraWeb < Formula
  desc "A minimalist, keyboard-driven PDF and EPUB reader"
  homepage "https://github.com/sebastiancordoba/web-pdf"
  url "https://github.com/sebastiancordoba/web-pdf/releases/download/v0.1.0/ZathuraWeb.app.tar.gz"
  sha256 "d3296ad397ea0acd3ba044581334b95b6c61ea732c4795b674ed441912b9eaad"
  version "0.1.0"

  def install
    prefix.install "ZathuraWeb.app"
    bin.write_exec_script "#{prefix}/ZathuraWeb.app/Contents/MacOS/ZathuraWeb"
    mv bin/"ZathuraWeb", bin/"web-pdf"
  end

  test do
    system "#{bin}/web-pdf", "--version"
  end
end

