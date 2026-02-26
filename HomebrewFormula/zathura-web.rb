class ZathuraWeb < Formula
  desc "A minimalist, keyboard-driven PDF and EPUB reader"
  homepage "https://github.com/sebastiancordoba/web-pdf"
  url "https://github.com/sebastiancordoba/web-pdf/releases/download/v0.1.0/ZathuraWeb.app.tar.gz"
  sha256 "REPLACE_ME_WITH_SHA" # You will need to calculate this
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

